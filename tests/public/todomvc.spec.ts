import { test, expect } from '@playwright/test';
import { TodoMVCPage } from '../../pages/todomvc.page';

test.describe('TodoMVC', () => {
  let todo: TodoMVCPage;

  test.beforeEach(async ({ page }) => {
    todo = new TodoMVCPage(page);
    await todo.navigate();
  });

  // ─── Adding todos ─────────────────────────────────────────────────────────

  test.describe('Adding todos', () => {
    test('adds a single todo', async () => {
      await todo.addTodo('Buy groceries');

      await todo.assertTodoVisible('Buy groceries');
      await todo.assertTodoCount(1);
      await todo.assertItemsLeft(1);
    });

    test('adds multiple todos in order', async () => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
      await todo.addTodo('Read a book');

      await todo.assertTodoCount(3);
      await todo.assertItemsLeft(3);
      await todo.assertTodoOrder(['Buy groceries', 'Walk the dog', 'Read a book']);
    });

    test('clears the input field after adding', async () => {
      await todo.addTodo('Buy groceries');
      await expect(todo.input).toHaveValue('');
    });

    test('does not add an empty todo', async () => {
      await todo.input.press('Enter');
      await todo.assertTodoCount(0);
    });
  });

  // ─── Completing todos ─────────────────────────────────────────────────────

  test.describe('Completing todos', () => {
    test.beforeEach(async () => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
    });

    test('marks a todo as complete', async () => {
      await todo.completeTodo('Buy groceries');

      await todo.assertTodoCompleted('Buy groceries');
      await todo.assertTodoActive('Walk the dog');
      await todo.assertItemsLeft(1);
    });

    test('unchecks a completed todo', async () => {
      await todo.completeTodo('Buy groceries');
      await todo.completeTodo('Buy groceries');

      await todo.assertTodoActive('Buy groceries');
      await todo.assertItemsLeft(2);
    });
  });

  // ─── Deleting todos ───────────────────────────────────────────────────────

  test.describe('Deleting todos', () => {
    test('removes a todo via the delete button', async () => {
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
    test('edits a todo on double-click and saves on Enter', async () => {
      await todo.addTodo('Buy groceries');

      await todo.editTodo('Buy groceries', 'Buy organic groceries');

      await todo.assertTodoVisible('Buy organic groceries');
      await todo.assertTodoHidden('Buy groceries');
    });

    test('discards edit on Escape', async ({ page }) => {
      await todo.addTodo('Buy groceries');
      await todo.todoItem('Buy groceries').locator('label').dblclick();

      const editInput = page.locator('li.editing .edit');
      await editInput.fill('Should be discarded');
      await editInput.press('Escape');

      await todo.assertTodoVisible('Buy groceries');
      await todo.assertTodoHidden('Should be discarded');
    });
  });

  // ─── Filtering ────────────────────────────────────────────────────────────

  test.describe('Filtering', () => {
    test.beforeEach(async () => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
      await todo.addTodo('Read a book');
      await todo.completeTodo('Buy groceries');
    });

    test('Active filter shows only incomplete todos', async () => {
      await todo.filterBy('Active');

      await todo.assertTodoHidden('Buy groceries');
      await todo.assertTodoVisible('Walk the dog');
      await todo.assertTodoVisible('Read a book');
    });

    test('Completed filter shows only finished todos', async () => {
      await todo.filterBy('Completed');

      await todo.assertTodoVisible('Buy groceries');
      await todo.assertTodoHidden('Walk the dog');
      await todo.assertTodoHidden('Read a book');
    });

    test('All filter shows every todo', async () => {
      await todo.filterBy('Completed');
      await todo.filterBy('All');

      await todo.assertTodoVisible('Buy groceries');
      await todo.assertTodoVisible('Walk the dog');
      await todo.assertTodoVisible('Read a book');
    });

    test('Active filter sets URL hash to #/active', async ({ page }) => {
      await todo.filterBy('Active');
      expect(page.url()).toContain('#/active');
    });

    test('Completed filter sets URL hash to #/completed', async ({ page }) => {
      await todo.filterBy('Completed');
      expect(page.url()).toContain('#/completed');
    });
  });

  // ─── Bulk actions ─────────────────────────────────────────────────────────

  test.describe('Bulk actions', () => {
    test.beforeEach(async () => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
      await todo.addTodo('Read a book');
    });

    test('toggle-all marks every todo as complete', async () => {
      await todo.toggleAll();

      await todo.assertTodoCompleted('Buy groceries');
      await todo.assertTodoCompleted('Walk the dog');
      await todo.assertTodoCompleted('Read a book');
      await todo.assertItemsLeft(0);
    });

    test('toggle-all unchecks all when all are already complete', async () => {
      await todo.toggleAll();
      await todo.toggleAll();

      await todo.assertTodoActive('Buy groceries');
      await todo.assertTodoActive('Walk the dog');
      await todo.assertTodoActive('Read a book');
      await todo.assertItemsLeft(3);
    });

    test('Clear completed removes all completed todos', async () => {
      await todo.completeTodo('Buy groceries');
      await todo.completeTodo('Walk the dog');

      await todo.clearCompleted();

      await todo.assertTodoHidden('Buy groceries');
      await todo.assertTodoHidden('Walk the dog');
      await todo.assertTodoVisible('Read a book');
      await todo.assertTodoCount(1);
    });

    test('Clear completed button is hidden when no todos are complete', async () => {
      await todo.assertClearCompletedHidden();
    });
  });

  // ─── Counter ──────────────────────────────────────────────────────────────

  test.describe('Items-left counter', () => {
    test('shows singular "item" for exactly one remaining', async () => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');
      await todo.completeTodo('Walk the dog');

      await todo.assertItemsLeft(1);
    });

    test('shows plural "items" for two or more remaining', async () => {
      await todo.addTodo('Buy groceries');
      await todo.addTodo('Walk the dog');

      await todo.assertItemsLeft(2);
    });
  });
});
