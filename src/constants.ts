import type { PaymentMethod } from './types';

export const STORAGE_KEY = 'house-construction-tracker-v1';

export const DEFAULT_LABOUR_TYPES = [
  'Mason / Master (Mastheeri)',
  'Mason helper',
  'General construction labour',
  'Carpenter',
  'Electrician',
  'Plumber',
  'Painter',
  'Steel / Rod worker',
  'Shuttering worker',
  'Tile worker',
  'Roofing worker',
  'Waterproofing worker',
  'Other / Custom labour',
];

export const DEFAULT_MATERIAL_TYPES = [
  'Bricks (செங்கல்)',
  'Cement (சிமெண்ட்)',
  'M-Sand',
  'P-Sand',
  'Salli / Blue Metal (ஜல்லி)',
  'Steel / Rods',
  'Gravel',
  'Other',
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food for Workers',
  'Tea & Snacks',
  'Water',
  'Transportation',
  'Vehicle Rent',
  'Equipment Rent',
  'Electricity',
  'Other',
];

export const DEFAULT_UNITS = [
  'Bags',
  'Pieces',
  'Loads',
  'Tonnes',
  'Kg',
  'Cubic Feet',
  'Litres',
  'Units',
  'Sq. Feet',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Card',
  'Other',
];
