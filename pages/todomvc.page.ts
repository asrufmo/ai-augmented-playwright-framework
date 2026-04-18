import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class TodoMVCPage extends BasePage {
  protected readonly path = 'https://demo.playwright.dev/todomvc/#/';

  readonly input: Locator;
  readonly toggleAllCheckbox: Locator;

  constructor(page: Page) {
    super(page);
    this.input = page.getByRole('textbox', { name: 'What needs to be done?' });
    this.toggleAllCheckbox = page.getByRole('checkbox', { name: /Mark all as complete/ });
  }

  todoItem(text: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: text });
  }

  private toggleFor(text: string): Locator {
    return this.todoItem(text).getByLabel('Toggle Todo');
  }

  async addTodo(text: string): Promise<void> {
    await this.input.fill(text);
    await this.input.press('Enter');
  }

  async completeTodo(text: string): Promise<void> {
    await this.toggleFor(text).click();
  }

  async deleteTodo(text: string): Promise<void> {
    const item = this.todoItem(text);
    await item.hover();
    await item.getByRole('button', { name: 'Delete' }).click();
  }

  async editTodo(currentText: string, newText: string): Promise<void> {
    await this.todoItem(currentText).locator('label').dblclick();
    const editInput = this.page.locator('li.editing .edit');
    await editInput.fill(newText);
    await editInput.press('Enter');
  }

  async fillEditAndDiscard(currentText: string, typedText: string): Promise<void> {
    await this.todoItem(currentText).locator('label').dblclick();
    const editInput = this.page.locator('li.editing .edit');
    await editInput.fill(typedText);
    await editInput.press('Escape');
  }

  async toggleAll(): Promise<void> {
    await this.toggleAllCheckbox.click();
  }

  async clearCompleted(): Promise<void> {
    await this.page.getByRole('button', { name: 'Clear completed' }).click();
  }

  async filterBy(filter: 'All' | 'Active' | 'Completed'): Promise<void> {
    await this.page.getByRole('link', { name: filter }).click();
  }

  async assertItemsLeft(count: number): Promise<void> {
    const word = count === 1 ? 'item' : 'items';
    await expect(this.page.locator('.todo-count')).toHaveText(`${count} ${word} left`);
  }

  async assertTodoVisible(text: string): Promise<void> {
    await expect(this.todoItem(text)).toBeVisible();
  }

  async assertTodoHidden(text: string): Promise<void> {
    await expect(this.todoItem(text)).not.toBeVisible();
  }

  async assertTodoCompleted(text: string): Promise<void> {
    await expect(this.toggleFor(text)).toBeChecked();
  }

  async assertTodoActive(text: string): Promise<void> {
    await expect(this.toggleFor(text)).not.toBeChecked();
  }

  async assertTodoCount(expected: number): Promise<void> {
    await expect(this.page.locator('.todo-list li')).toHaveCount(expected);
  }

  async assertTodoOrder(texts: string[]): Promise<void> {
    const labels = this.page.locator('.todo-list li label');
    for (let i = 0; i < texts.length; i++) {
      await expect(labels.nth(i)).toHaveText(texts[i]);
    }
  }

  async assertClearCompletedHidden(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Clear completed' })).not.toBeVisible();
  }
}
