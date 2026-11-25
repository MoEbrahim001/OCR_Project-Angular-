export const environment = {
  production: false,

  records: {
    list: 'http://localhost:5100/api/Records',
    create: 'http://localhost:5100/api/Records',
    edit: 'http://localhost:5100/api/Records/',
    delete: 'http://localhost:5100/api/Records/',
    getbyid: 'http://localhost:5100/api/Records/',
    search: 'http://localhost:5100/api/Records/Search',
    exportExcel: 'http://localhost:5100/api/Records/export/excel',
    exportPdf: 'http://localhost:5100/api/Records/export/pdf'
  },

  ocr: {
    front: 'http://localhost:5100/api/Ocr/extract/front',
    back: 'http://localhost:5100/api/Ocr/extract/back',
    import: 'http://localhost:5100/api/Ocr/import'
  },

  dashboard: {
    stats: 'http://localhost:5100/api/Dashboard/stats'
  }
};