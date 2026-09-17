export const environment = {
  production: true,

  // Adjust to your real production API base if different
  apiBaseUrl: 'http://localhost:6001/api',

  ocr: {
    front:  'http://localhost:6001/api/Ocr/extract/front',
    back:   'http://localhost:6001/api/Ocr/extract/back',     
  },
  records: {
    list:   'http://localhost:6001/api/Records',
    import: 'http://localhost:6001/api/Records/import'
  }

};