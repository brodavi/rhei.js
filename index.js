FBP.debug(true);

/*
 * Define the networks/connections
 */

FBP.network({
  name: 'ajax',
  processes: [
    {name: 'ajax', component: 'ajax'},
    {name: 'ajaxErr', component: 'ajax'},
    {name: 'storeTodos', component: 'store'},
    {name: 'storeErr', component: 'store'},
    {name: 'buildToDoList', component: 'buildToDoList'},
    {name: 'updateDOM', component: 'replace'},
    {name: 'updateDOMErr', component: 'replace'},
    {name: 'log', component: 'log'}
  ],
  connections: {
    'ajax.output': 'log.input',
    'log.output': 'storeTodos.data',
    'storeTodos.output': 'buildToDoList.todos',
    'buildToDoList.output': 'updateDOM.content',
    // error branch
    'ajax.outputErr': 'ajaxErr.url',
    'ajaxErr.output': 'storeErr.data',
    'storeErr.output': 'updateDOMErr.content'
  }
});

FBP.network({
  name: 'filterdone',
  processes: [
    {name: 'getTodos', component: 'retrieve'},
    {name: 'onlyDone', component: 'onlyDone'},
    {name: 'buildToDoList', component: 'buildToDoList'},
    {name: 'updateDOM', component: 'replace'}
  ],
  connections: {
    'getTodos.output': 'onlyDone.todos',
    'onlyDone.output': 'buildToDoList.todos',
    'buildToDoList.output': 'updateDOM.content'
  }
});

FBP.network({
  name: 'filter',
  processes: [
    {name: 'getTodos', component: 'retrieve'},
    {name: 'filter', component: 'filter'},
    {name: 'buildToDoList', component: 'buildToDoList'},
    {name: 'updateDOM', component: 'replace'}
  ],
  connections: {
    'getTodos.output': 'filter.coll',
    'filter.output': 'buildToDoList.todos',
    'buildToDoList.output': 'updateDOM.content'
  }
});

/*
 * Actually run the networks
 */

function testError () {
  FBP.go(
    'ajax',
    {
      'ajax.url': 'http://localhost:3030/testError',
      'ajax.method': 'GET',
      'ajax.data': null,
      'ajaxErr.method': 'GET',
      'ajaxErr.data': null,
      'storeTodos.key': 'todos',
      'storeErr.key': 'errors',
      'updateDOM.target': 'todos',
      'updateDOMErr.target': 'testError'
    }
  );
}

function runGetAll () {
  var query = document.getElementById('searchString').value;

  FBP.go(
    'ajax',
    {
      'ajax.url': 'http://localhost:3030/todos',
      'ajax.method': 'GET',
      'ajax.data': null,
      'storeTodos.key': 'todos',
      'updateDOM.target': 'todos'
    }
  );
}

function runSearch () {
  var query = document.getElementById('searchString').value;

  FBP.go(
    'ajax',
    {
      'ajax.url': 'http://localhost:3030/search?search=' + query,
      'ajax.method': 'GET',
      'ajax.data': null,
      'storeTodos.key': 'todos', // parameterization of storage component (needs localstorage key)
      'updateDOM.target': 'todos'
    }
  );
}

function runAdd () {
  var text = document.getElementById('newTodoText').value;

  FBP.go(
    'ajax',
    {
      'ajax.url': 'http://localhost:3030/todos',
      'ajax.method': 'POST',
      'ajax.data': {task: text, status: 'in progress'},
      'storeTodos.key': 'todos', // parameterization of storage component (needs localstorage key)
      'updateDOM.target': 'todos'
    }
  );
}

function runDelete (e) {
  var id = e.target.dataset.id;

  FBP.go(
    'ajax',
    {
      'ajax.url': 'http://localhost:3030/todo/' + id,
      'ajax.method': 'DELETE',
      'ajax.data': null,
      'storeTodos.key': 'todos', // parameterization of storage component (needs localstorage key)
      'updateDOM.target': 'todos'
    }
  );
}

function runToggleStatus (e) {
  var id = e.target.dataset.id;
  var status = e.target.innerHTML == "in progress" ? "done" : "in progress";

  FBP.go(
    'ajax',
    {
      'ajax.url': 'http://localhost:3030/todo/' + id,
      'ajax.method': 'PUT',
      'ajax.data': {status: status},
      'storeTodos.key': 'todos', // parameterization of storage component (needs localstorage key)
      'updateDOM.target': 'todos'
    }
  );
}

function runFilter (e) {
  var filter = document.getElementById('filterString').value;

  FBP.go(
    'filter',
    {
      'getTodos.key': 'todos',
      'updateDOM.target': 'todos',
      'filter.key': 'task',
      'filter.filterString': filter
    }
  );
}

function runFilterDone (e) {
  var filter = e.checked;

  if (filter) {
    FBP.go(
      'filterdone',
      {
        'getTodos.key': 'todos',
        'updateDOM.target': 'todos'
      }
    );
  } else {
    FBP.go(
      'filter',
      {
        'getTodos.key': 'todos',
        'updateDOM.target': 'todos',
        'filter.key': 'task',
        'filter.filterString': null
      }
    );
  }
}
