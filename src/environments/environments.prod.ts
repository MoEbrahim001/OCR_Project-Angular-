export const environment = {
  production: true,

  // Adjust to your real production API base if different
  apiBaseUrl: 'http://localhost:5100/api',

  ocr: {
    front:  'http://localhost:5100/api/Ocr/extract/front',
    back:   'http://localhost:5100/api/Ocr/extract/back',     
  },
  records: {
    list:   'http://localhost:5100/api/Records',
    import: 'http://localhost:5100/api/Records/import'
  }

};