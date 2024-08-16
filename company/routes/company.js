module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/posts-report',
      handler: 'company.getNodes',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'POST',
      path: '/create',
      handler: 'company.createNode',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'DELETE',
      path: '/delete/:id',
      handler: 'company.deleteNode',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    // api for updating name

    {
      method: 'PUT',
      path: '/editname/:id',
      handler: 'company.editName',
      config: {
        policies: [],
        middlewares: [],
      },
    },


    //api for updating node psotion

    {
      method: 'PUT',
      path: '/editposition/:id',
      handler: 'company.editPosition',
      config: {
        policies: [],
        middlewares: [],
      },
    },



    //api for filter

    {
      method: 'GET',
      path: '/filter',
      handler: 'company.filter',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'GET',
      path: '/rootnode',
      handler: 'company.getRootNode',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'GET',
      path: '/childrenNode/:name',
      handler: 'company.childrens',
      config: {
        policies: [],
        middlewares: [],
      },
    },


  ],
};
