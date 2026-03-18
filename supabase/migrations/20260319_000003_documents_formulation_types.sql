-- Add updated_at column to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Drop existing document_type CHECK constraint and add expanded one
-- (supports formulation doc types: ingredients_en, formula_breakdown, inci_summary, msds, coa)
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_document_type_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_document_type_check CHECK (
    document_type IN (
      'invoice', 'packing_list', 'coo', 'shipping_mark', 'tracking_doc', 'product_sheet', 'other',
      'ingredients_en', 'formula_breakdown', 'inci_summary', 'msds', 'coa'
    )
  );
