export const environment = {
  production: true,

  apiBaseUrl: '/api',

  ocr: {
    front: '/api/Ocr/extract/front',
    back: '/api/Ocr/extract/back'
  },

  records: {
    list: '/api/Records',
    create: '/api/Records',
    edit: '/api/Records/',
    delete: '/api/Records/',
    getbyid: '/api/Records/',
    search: '/api/Records/Search',
    exportExcel: '/api/Records/export/excel',
    exportPdf: '/api/Records/export/pdf',
    import: '/api/Records/import'
  }
};