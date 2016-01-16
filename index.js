FBP.debug(true);

/*
 * Define the networks/connections
 */

FBP.network({
  name: 'ajax',
  delay: 200,
  processes: [
    {name: 'ajax', component: 'ajax'},
    {name: 'split1', component: 'split'},
    {name: 'split2', component: 'split'},
    {name: 'storeTodos', component: 'store'},
    {name: 'storeErr', component: 'store'},
    {name: 'buildToDoList', component: 'buildToDoList'},
    {name: 'updateDOM', component: 'replace'}
  ],
  connections: {
    'ajax.output': 'split1.data',
    'split1.output1': 'storeTodos.data',
    'split1.output2': 'buildToDoList.todos',
    'buildToDoList.output': 'updateDOM.content',
    // error branch
    'ajax.outputErr': 'split2.data',
    'split2.output1': 'storeErr.data',
    'split2.output2': 'updateDOM.content'
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
      'storeErr.key': 'errors',
      'updateDOM.target': 'todos'
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
