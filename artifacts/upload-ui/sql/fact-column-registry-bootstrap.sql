create or replace function public.refresh_fact_column_registry(
  p_fact_id bigint,
  p_table_name text
)
returns void
language plpgsql
as $$
begin
  if p_table_name is null or btrim(p_table_name) = '' then
    return;
  end if;

  delete from public.fact_column_registry
  where fact_id = p_fact_id;

  insert into public.fact_column_registry (
    fact_id,
    column_name,
    display_name,
    data_type,
    is_required,
    is_dimension,
    is_measure,
    is_system_column,
    display_order,
    description
  )
  select
    p_fact_id,
    c.column_name,
    initcap(replace(c.column_name, '_', ' ')) as display_name,
    c.data_type,
    case
      when c.column_name in (
        'fact_row_id',
        'upload_batch_id',
        'fact_id',
        'company_id',
        'plan_id',
        'cost_center_id',
        'source_row_no',
        'input_by',
        'created_by',
        'manage_status',
        'validation_status',
        'note',
        'row_hash',
        'created_at',
        'updated_at',
        'created_time'
      ) then false
      when c.is_nullable = 'NO' and c.column_default is null then true
      else false
    end as is_required,
    case
      when c.column_name in (
        'fact_row_id',
        'upload_batch_id',
        'fact_id',
        'company_id',
        'plan_id',
        'cost_center_id',
        'source_row_no',
        'input_by',
        'created_by',
        'manage_status',
        'validation_status',
        'note',
        'row_hash',
        'created_at',
        'updated_at',
        'created_time',
        'extra_data'
      ) then false
      when c.data_type in ('smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision') then false
      else true
    end as is_dimension,
    case
      when c.column_name in (
        'fact_row_id',
        'upload_batch_id',
        'fact_id',
        'company_id',
        'plan_id',
        'cost_center_id',
        'source_row_no',
        'input_by',
        'created_by',
        'manage_status',
        'validation_status',
        'note',
        'row_hash',
        'created_at',
        'updated_at',
        'created_time',
        'extra_data'
      ) then false
      when c.data_type in ('smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision') then true
      else false
    end as is_measure,
    c.column_name in (
      'fact_row_id',
      'upload_batch_id',
      'fact_id',
      'company_id',
      'plan_id',
      'cost_center_id',
      'source_row_no',
      'input_by',
      'created_by',
      'manage_status',
      'validation_status',
      'note',
      'row_hash',
      'created_at',
      'updated_at',
      'created_time',
      'extra_data'
    ) as is_system_column,
    c.ordinal_position,
    format('Auto synced from public.%I', p_table_name)
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_table_name
  order by c.ordinal_position;
end;
$$;

create or replace function public.trg_refresh_fact_column_registry()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_fact_column_registry(new.fact_id, new.table_name);
  return new;
end;
$$;

drop trigger if exists trg_fact_registry_refresh_columns on public.fact_registry;

create trigger trg_fact_registry_refresh_columns
after insert or update of table_name
on public.fact_registry
for each row
execute function public.trg_refresh_fact_column_registry();

create or replace function public.refresh_all_fact_column_registry()
returns void
language plpgsql
as $$
declare
  fact_row record;
begin
  for fact_row in
    select fact_id, table_name
    from public.fact_registry
    where is_active = true
  loop
    perform public.refresh_fact_column_registry(fact_row.fact_id, fact_row.table_name);
  end loop;
end;
$$;

select public.refresh_all_fact_column_registry();

with mapped_headers (table_name, column_name, source_excel_header, display_order, is_required) as (
  values
    ('fact_hqkd', 'data_date', 'Ngày', 1, true),
    ('fact_hqkd', 'cl_indicator_id', 'Mã hệ thống', 2, true),
    ('fact_hqkd', 'rw_indicator_group', 'Nhóm chỉ tiêu', 3, true),
    ('fact_hqkd', 'rw_indicator_item', 'Khoản mục', 4, true),
    ('fact_hqkd', 'rw_indicator_sub_item', 'Tiểu mục', 5, true),
    ('fact_hqkd', 'is_input_allowed', 'Thuộc tính', 6, true),
    ('fact_hqkd', 'content_name', 'Nội dung', 7, true),
    ('fact_hqkd', 'company_id', 'Công ty', 8, true),
    ('fact_hqkd', 'scenario', 'Loại dữ liệu', 9, true),
    ('fact_hqkd', 'plan_id', 'Khối', 10, true),
    ('fact_hqkd', 'cost_center_id', 'Bộ phận', 11, true),
    ('fact_hqkd', 'amount', 'Số tiền', 12, true),
    ('fact_su_dung_tien', 'data_date', 'Ngày', 1, true),
    ('fact_su_dung_tien', 'indicator_group', 'Nhóm chỉ tiêu', 2, true),
    ('fact_su_dung_tien', 'money_type', 'Loại tiền', 3, true),
    ('fact_su_dung_tien', 'company_id', 'Công ty', 4, true),
    ('fact_su_dung_tien', 'bank_name', 'Ngân hàng', 5, true),
    ('fact_su_dung_tien', 'attribute_text', 'Thuộc tính', 6, true),
    ('fact_su_dung_tien', 'company_name_in_file', 'Công ty (2)', 7, true),
    ('fact_su_dung_tien', 'scenario', 'Loại dữ liệu', 8, true),
    ('fact_su_dung_tien', 'plan_id', 'Khối', 9, true),
    ('fact_su_dung_tien', 'cost_center_id', 'Bộ phận', 10, true),
    ('fact_su_dung_tien', 'amount', 'Số tiền', 11, true),
    ('fact_su_dung_tien', 'variance_amount', 'Chênh lệch', 12, true),
    ('fact_thu_chi', 'data_date', 'Ngày', 1, true),
    ('fact_thu_chi', 'indicator_group', 'Nhóm chỉ tiêu', 2, true),
    ('fact_thu_chi', 'category_name', 'Danh mục', 3, true),
    ('fact_thu_chi', 'source_name', 'Nguồn', 4, true),
    ('fact_thu_chi', 'business_block_name', 'Khối', 5, true),
    ('fact_thu_chi', 'facility_name', 'Cơ sở', 6, true),
    ('fact_thu_chi', 'tm_amount', 'TM', 7, true),
    ('fact_thu_chi', 'nh_amount', 'NH', 8, true),
    ('fact_thu_chi', 'vay_amount', 'TVAY', 9, true),
    ('fact_thu_chi', 'total_amount', 'Tổng', 10, true),
    ('fact_thu_chi', 'attribute_text', 'Thuộc tính', 11, true),
    ('fact_thu_chi', 'company_id', 'Công ty', 12, true),
    ('fact_thu_chi', 'scenario', 'Loại dữ liệu', 13, true),
    ('fact_thu_chi', 'plan_id', 'Khối (2)', 14, true),
    ('fact_thu_chi', 'cost_center_id', 'Bộ phận', 15, true)
)
update public.fact_column_registry c
set
  source_excel_header = mapped_headers.source_excel_header,
  source_excel_column = mapped_headers.source_excel_header,
  display_name = mapped_headers.source_excel_header,
  display_order = mapped_headers.display_order,
  is_required = mapped_headers.is_required
from mapped_headers
join public.fact_registry f
  on f.table_name = mapped_headers.table_name
where c.fact_id = f.fact_id
  and c.column_name = mapped_headers.column_name;

comment on function public.refresh_fact_column_registry(bigint, text) is
'Auto sync all columns from fact_registry.table_name into fact_column_registry. After adding a new fact table, only source_excel_header/display_order metadata needs to be completed.';
