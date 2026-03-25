-- Assign or update a student's pending fee with DB-calculated due date.
-- Rule: due_date is always CURRENT_DATE + 21 days (computed in DB only).
create or replace function public.admin_assign_student_fee(
  p_student_id bigint,
  p_amount numeric,
  p_note text default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_fee_id bigint;
  v_due_date date := (current_date + interval '21 days')::date;
  v_has_description boolean := false;
  v_has_note boolean := false;
begin
  if p_student_id is null then
    return json_build_object('ok', false, 'error', 'student_id is required');
  end if;

  if p_amount is null or p_amount <= 0 then
    return json_build_object('ok', false, 'error', 'amount must be greater than zero');
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fee'
      and column_name = 'description'
  ) into v_has_description;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fee'
      and column_name = 'note'
  ) into v_has_note;

  select fee_id
  into v_fee_id
  from public.fee
  where student_id = p_student_id
    and lower(coalesce(status, 'pending')) = 'pending'
  order by due_date asc nulls last, fee_id desc
  limit 1;

  if v_fee_id is not null then
    if v_has_description then
      update public.fee
      set amount = p_amount,
          due_date = v_due_date,
          status = 'pending',
          description = coalesce(nullif(trim(p_note), ''), description)
      where fee_id = v_fee_id;
    elsif v_has_note then
      update public.fee
      set amount = p_amount,
          due_date = v_due_date,
          status = 'pending',
          note = coalesce(nullif(trim(p_note), ''), note)
      where fee_id = v_fee_id;
    else
      update public.fee
      set amount = p_amount,
          due_date = v_due_date,
          status = 'pending'
      where fee_id = v_fee_id;
    end if;

    return json_build_object('ok', true, 'action', 'updated', 'due_date', v_due_date);
  end if;

  if v_has_description then
    insert into public.fee (student_id, amount, due_date, status, description)
    values (
      p_student_id,
      p_amount,
      v_due_date,
      'pending',
      nullif(trim(p_note), '')
    );
  elsif v_has_note then
    insert into public.fee (student_id, amount, due_date, status, note)
    values (
      p_student_id,
      p_amount,
      v_due_date,
      'pending',
      nullif(trim(p_note), '')
    );
  else
    insert into public.fee (student_id, amount, due_date, status)
    values (
      p_student_id, p_amount, v_due_date, 'pending'
    );
  end if;

  return json_build_object('ok', true, 'action', 'inserted', 'due_date', v_due_date);
end;
$$;

grant execute on function public.admin_assign_student_fee(bigint, numeric, text) to authenticated;
