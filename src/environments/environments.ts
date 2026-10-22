export const environment = {
  production: false,

  records: {
    list: '/api/Records',
    create: '/api/Records',
    edit: '/api/Records/',
    delete: '/api/Records/',
    getbyid: '/api/Records/',
    search: '/api/Records/Search',
    exportExcel: '/api/Records/export/excel',
    exportPdf: '/api/Records/export/pdf'
  },

  ocr: {
    front: '/api/Ocr/extract/front',
    back: '/api/Ocr/extract/back',
    import: '/api/Ocr/import'
  }
};