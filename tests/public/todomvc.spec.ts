import { test, expect } from '../../fixtures';

test.describe('TodoMVC', () => {

  // ─── Adding todos ─────────────────────────────────────────────────────────

  test.describe('Adding todos', () => {
    test('adds a single todo', async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');

      await todo.assertTodoVisible('Buy groceries');
      await todo.assertTodoCount(1);
      await todo.assertItemsLeft(1);
    });

    test('adds multiple todos in order', async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
      await todo.addTodo('Read a book');

      await todo.assertTodoCount(3);
      await todo.assertItemsLeft(3);
      await todo.assertTodoOrder(['Buy groceries', 'Walk the dog', 'Read a book']);
    });

    test('clears the input field after adding', async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');
      await expect(todo.input).toHaveValue('');
    });

    test('does not add an empty todo', async ({ todoPage: todo }) => {
      await todo.input.press('Enter');
      await todo.assertTodoCount(0);
    });
  });

  // ─── Completing todos ─────────────────────────────────────────────────────

  test.describe('Completing todos', () => {
    test.beforeEach(async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
    });

    test('marks a todo as complete', async ({ todoPage: todo }) => {
      await todo.completeTodo('Buy groceries');

      await todo.assertTodoCompleted('Buy groceries');
      await todo.assertTodoActive('Walk the dog');
      await todo.assertItemsLeft(1);
    });

    test('unchecks a completed todo', async ({ todoPage: todo }) => {
      await todo.completeTodo('Buy groceries');
      await todo.completeTodo('Buy groceries');

      await todo.assertTodoActive('Buy groceries');
      await todo.assertItemsLeft(2);
    });
  });

  // ─── Deleting todos ───────────────────────────────────────────────────────

  test.describe('Deleting todos', () => {
    test('removes a todo via the delete button', async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');

      await todo.deleteTodo('Buy groceries');

      await todo.assertTodoHidden('Buy groceries');
      await todo.assertTodoVisible('Walk the dog');
      await todo.assertTodoCount(1);
    });
  });

  // ─── Editing todos ────────────────────────────────────────────────────────

  test.describe('Editing todos', () => {
    test('edits a todo on double-click and saves on Enter', async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');

      await todo.editTodo('Buy groceries', 'Buy organic groceries');

      await todo.assertTodoVisible('Buy organic groceries');
      await todo.assertTodoHidden('Buy groceries');
    });

    test('discards edit on Escape', async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');

      await todo.fillEditAndDiscard('Buy groceries', 'Should be discarded');

      await todo.assertTodoVisible('Buy groceries');
      await todo.assertTodoHidden('Should be discarded');
    });
  });

  // ─── Filtering ────────────────────────────────────────────────────────────

  test.describe('Filtering', () => {
    test.beforeEach(async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
      await todo.addTodo('Read a book');
      await todo.completeTodo('Buy groceries');
    });

    test('Active filter shows only incomplete todos', async ({ todoPage: todo }) => {
      await todo.filterBy('Active');

      await todo.assertTodoHidden('Buy groceries');
      await todo.assertTodoVisible('Walk the dog');
      await todo.assertTodoVisible('Read a book');
    });

    test('Completed filter shows only finished todos', async ({ todoPage: todo }) => {
      await todo.filterBy('Completed');

      await todo.assertTodoVisible('Buy groceries');
      await todo.assertTodoHidden('Walk the dog');
      await todo.assertTodoHidden('Read a book');
    });

    test('All filter shows every todo', async ({ todoPage: todo }) => {
      await todo.filterBy('Completed');
      await todo.filterBy('All');

      await todo.assertTodoVisible('Buy groceries');
      await todo.assertTodoVisible('Walk the dog');
      await todo.assertTodoVisible('Read a book');
    });

    test('Active filter sets URL hash to #/active', async ({ todoPage: todo }) => {
      await todo.filterBy('Active');
      await todo.assertURL(/#\/active/);
    });

    test('Completed filter sets URL hash to #/completed', async ({ todoPage: todo }) => {
      await todo.filterBy('Completed');
      await todo.assertURL(/#\/completed/);
    });
  });

  // ─── Bulk actions ─────────────────────────────────────────────────────────

  test.describe('Bulk actions', () => {
    test.beforeEach(async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
      await todo.addTodo('Read a book');
    });

    test('toggle-all marks every todo as complete', async ({ todoPage: todo }) => {
      await todo.toggleAll();

      await todo.assertTodoCompleted('Buy groceries');
      await todo.assertTodoCompleted('Walk the dog');
      await todo.assertTodoCompleted('Read a book');
      await todo.assertItemsLeft(0);
    });

    test('toggle-all unchecks all when all are already complete', async ({ todoPage: todo }) => {
      await todo.toggleAll();
      await todo.toggleAll();

      await todo.assertTodoActive('Buy groceries');
      await todo.assertTodoActive('Walk the dog');
      await todo.assertTodoActive('Read a book');
      await todo.assertItemsLeft(3);
    });

    test('Clear completed removes all completed todos', async ({ todoPage: todo }) => {
      await todo.completeTodo('Buy groceries');
      await todo.completeTodo('Walk the dog');

      await todo.clearCompleted();

      await todo.assertTodoHidden('Buy groceries');
      await todo.assertTodoHidden('Walk the dog');
      await todo.assertTodoVisible('Read a book');
      await todo.assertTodoCount(1);
    });

    test('Clear completed button is hidden when no todos are complete', async ({ todoPage: todo }) => {
      await todo.assertClearCompletedHidden();
    });
  });

  // ─── Counter ──────────────────────────────────────────────────────────────

  test.describe('Items-left counter', () => {
    test('shows singular "item" for exactly one remaining', async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
      await todo.completeTodo('Walk the dog');

      await todo.assertItemsLeft(1);
    });

    test('shows plural "items" for two or more remaining', async ({ todoPage: todo }) => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');

      await todo.assertItemsLeft(2);
    });
  });
});
