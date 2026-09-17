export const environment = {
  production: false,

  records: {
    list:   'http://localhost:6001/api/Records',   
  create: '/save', 
    edit:'http://localhost:6001/api/Records/',
    delete:'http://localhost:6001/api/Records/',
    getbyid:'http://localhost:6001/api/Records/',
    search: 'http://localhost:6001/api/Records/Search'

  },

  ocr: {
    front: 'http://localhost:6001/api/Ocr/extract/front',
    back:  'http://localhost:6001/api/Ocr/extract/back',
   import: 'http://localhost:6001/api/Ocr/import' 

  }
};
