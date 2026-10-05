export const environment = {
  production: false,

  records: {
    list:   'http://localhost:5100/api/Records',
    create: 'http://localhost:5100/api/Records',
    edit:   'http://localhost:5100/api/Records/',
    delete: 'http://localhost:5100/api/Records/',
    getbyid:'http://localhost:5100/api/Records/',
    search: 'http://localhost:5100/api/Records/Search'
  },

  /*
   * Legacy direct-Angular OCR endpoints.
   *
   * The updated RecordFormComponent no longer calls these endpoints.
   * OCR now flows:
   *
   * Gradio (localhost:8000)
   *   -> /ocr-results
   *   -> Chrome Extension
   *   -> Angular form
   *
   * Keep this block for now so any other existing service/file that still
   * references environment.ocr does not break at compile time.
   */
  ocr: {
    front:  'http://localhost:5100/api/Ocr/extract/front',
    back:   'http://localhost:5100/api/Ocr/extract/back',
    import: 'http://localhost:5100/api/Ocr/import'
  }
};
