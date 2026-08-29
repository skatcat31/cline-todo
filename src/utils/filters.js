/**
 * The filters the task list can be shown with (value + button label).
 * FilterBar renders the buttons from this list and the app imports it to
 * validate the value persisted in localStorage. (Kept in its own module
 * so component files keep exporting components only.)
 */
export const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];
