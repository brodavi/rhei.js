// import choo's template helper
const html = require('choo/html')

const STATUS_IN_PROGRESS = 0
const STATUS_DONE = 1

module.exports = function (state, emit) {
  return html`
    <div class="app">
      <div class="box">
        <h1>TODOS</h1>
      </div>

      <ul id="todos" class="box">
        ${state.todos.map(todo)}
      </ul>

      <div class="box">
        <input id="searchString" type="text">
        <button onclick=${runSearch}>SEARCH</button>
        <button onclick=${runGetAll}>ALL</button>
      </div>

      <div class="box">
        <input id="filterString" type="text" value=${state.filterString}>
        <button onclick=${runFilter}>FILTER</button>
        <input type="checkbox" onclick=${runFilterDone} ${state.filterDone === 1 ? 'checked' : ''}> ONLY DONE
      </div>

      <div class="box">
        <input id="newTodoText" type="text">
        <button onclick=${runAdd}>ADD</button>
      </div>

      <div id="testError" class="box">
        <button onclick=${runTestError}>TEST ERROR</button>
        <ul class="errors">
          ${state.errors.map(error)}
        </ul>
      </div>

      <hr />
    </div>
  `

  function error (error) {
    return html`
      <li class="error">
        ${error}
      </li>
    `
  }

  function todo (todo) {
    return html`
      <div class="todo">
        <span class="remove" data-id=${todo.id} onclick=${runDelete}>×</span>
        <span class="task" data-id=${todo.id}>${todo.task}</span>
        <span class="status" data-id=${todo.id} data-status=${todo.status}
              onclick=${runToggleStatus}>${todo.status === STATUS_IN_PROGRESS ? 'in progress' : 'done'}</span>
      </div>
    `
  }

  function runDelete (e) {
    const id = e.target.dataset.id

    FBP.log(`running delete on id: ${id}`)
    emit('deleteTodo', id)
  }

  function runToggleStatus (e) {
    const id = parseInt(e.target.dataset.id, 10)
    const status = parseInt(e.target.dataset.status, 10) === STATUS_IN_PROGRESS ? STATUS_DONE : STATUS_IN_PROGRESS

    emit('toggleStatus', id, status)
  }

  function runSearch () {
    const query = document.getElementById('searchString').value
    emit('search', query)
  }

  function runGetAll () {
    emit('getAll')
  }

  function runFilter () {
    const filterString = document.getElementById('filterString').value
    emit('filter', 'task', filterString)
  }

  function runFilterDone () {
    emit('filter', 'status', state.filterDone === 1 ? 0 : 1)
  }

  function runAdd () {
    const text = document.getElementById('newTodoText').value
    emit('add', text)
  }

  function runTestError () {
    emit('testError')
  }
}
