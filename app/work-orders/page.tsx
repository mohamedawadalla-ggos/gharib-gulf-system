// === TypeScript Types ===
type SortColumn = 'work_order_number' | 'title' | 'status' | 'priority' | 'assigned_crew' | 'due_date' | 'created_at';
type SortDirection = 'asc' | 'desc';

// === Sort Function ===
const sortData = (data: WorkOrder[]): WorkOrder[] => {
  return [...data].sort((a, b) => {
    let aValue: any = a[sortColumn];
    let bValue: any = b[sortColumn];

    // Handle dates
    if (sortColumn === 'due_date' || sortColumn === 'created_at') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    // Handle strings
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
};