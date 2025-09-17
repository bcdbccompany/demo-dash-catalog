import { test, expect } from '@playwright/test';

const mockPosts = [
  {
    userId: 1,
    id: 1,
    title: 'sunt aut facere repellat provident',
    body: 'quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam'
  },
  {
    userId: 1,
    id: 2,
    title: 'qui est esse',
    body: 'est rerum tempore vitae\nsequi sint nihil reprehenderit dolor beatae ea dolores neque'
  },
  {
    userId: 2,
    id: 3,
    title: 'ea molestias quasi exercitationem',
    body: 'et iusto sed quo iure\nvoluptatem occaecati omnis eligendi aut ad'
  }
];

const mockUsers = [
  { id: 1, name: 'Leanne Graham', username: 'Bret' },
  { id: 2, name: 'Ervin Howell', username: 'Antonette' }
];

const mockComments = [
  {
    postId: 1,
    id: 1,
    name: 'id labore ex et quam laborum',
    email: 'Eliseo@gardner.biz',
    body: 'laudantium enim quasi est quidem magnam voluptate ipsam eos'
  }
];

test.describe('Posts E2E @posts', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await page.route('**/jsonplaceholder.typicode.com/posts**', async route => {
      const url = route.request().url();
      if (url.includes('_limit=')) {
        await route.fulfill({ json: mockPosts });
      } else {
        await route.fulfill({ json: mockPosts });
      }
    });

    await page.route('**/jsonplaceholder.typicode.com/users**', async route => {
      await route.fulfill({ json: mockUsers });
    });

    await page.route('**/jsonplaceholder.typicode.com/posts/*/comments**', async route => {
      await route.fulfill({ json: mockComments });
    });

    // Login and navigate to posts
    await page.goto('/login');
    await page.getByTestId('login-username').fill('admin');
    await page.getByTestId('login-password').fill('admin123');
    await page.getByTestId('login-submit').click();
    
    await page.getByTestId('nav-posts').click();
    await expect(page).toHaveURL('/posts');
  });

  test('should load and display posts', async ({ page }) => {
    await test.step('Verify posts page loads', async () => {
      await expect(page.getByText('Posts')).toBeVisible();
      await expect(page.getByTestId('posts-search')).toBeVisible();
      await expect(page.getByTestId('post-form')).toBeVisible();
    });

    await test.step('Verify posts are displayed', async () => {
      await expect(page.getByText('sunt aut facere repellat provident')).toBeVisible();
      await expect(page.getByText('qui est esse')).toBeVisible();
      await expect(page.getByText('ea molestias quasi exercitationem')).toBeVisible();
    });

    await test.step('Verify form fields are loaded', async () => {
      await expect(page.getByTestId('post-title')).toBeVisible();
      await expect(page.getByTestId('post-body')).toBeVisible();
      await expect(page.getByTestId('post-author')).toBeVisible();
      await expect(page.getByTestId('post-submit')).toBeVisible();
    });
  });

  test('should search posts by title', async ({ page }) => {
    await test.step('Load initial posts', async () => {
      await expect(page.getByText('sunt aut facere repellat provident')).toBeVisible();
    });

    await test.step('Search for specific post', async () => {
      await page.getByTestId('posts-search').fill('qui est esse');
      
      // Wait for debounce
      await page.waitForTimeout(350);
      
      await expect(page.getByText('qui est esse')).toBeVisible();
      await expect(page.getByText('sunt aut facere repellat provident')).not.toBeVisible();
    });

    await test.step('Clear search', async () => {
      await page.getByTestId('posts-search').clear();
      await page.waitForTimeout(350);
      
      await expect(page.getByText('sunt aut facere repellat provident')).toBeVisible();
      await expect(page.getByText('qui est esse')).toBeVisible();
    });
  });

  test('should create new post', async ({ page }) => {
    await test.step('Setup POST mock', async () => {
      await page.route('**/jsonplaceholder.typicode.com/posts', async route => {
        if (route.request().method() === 'POST') {
          const body = await route.request().postDataJSON();
          await route.fulfill({ 
            json: { id: 101, ...body } 
          });
        } else {
          await route.fulfill({ json: mockPosts });
        }
      });
    });

    await test.step('Fill and submit new post form', async () => {
      await page.getByTestId('post-title').fill('Test Post Title');
      await page.getByTestId('post-body').fill('This is a test post body content.');
      
      // Select author
      await page.getByTestId('post-author').click();
      await expect(page.getByText('Leanne Graham')).toBeVisible();
      await page.getByText('Leanne Graham').click();
      
      await page.getByTestId('post-submit').click();
    });

    await test.step('Verify new post appears and form resets', async () => {
      // Should show success toast
      await expect(page.getByText('Post criado com sucesso!')).toBeVisible();
      
      // New post should appear at the top
      await expect(page.getByText('Test Post Title')).toBeVisible();
      
      // Form should be reset
      await expect(page.getByTestId('post-title')).toHaveValue('');
      await expect(page.getByTestId('post-body')).toHaveValue('');
    });
  });

  test('should validate required fields', async ({ page }) => {
    await test.step('Try to submit empty form', async () => {
      await page.getByTestId('post-submit').click();
      
      // Should show validation errors
      await expect(page.getByText('Título é obrigatório')).toBeVisible();
      await expect(page.getByText('Conteúdo é obrigatório')).toBeVisible();
      await expect(page.getByText('Autor é obrigatório')).toBeVisible();
    });

    await test.step('Fill only title and try to submit', async () => {
      await page.getByTestId('post-title').fill('Test Title');
      await page.getByTestId('post-submit').click();
      
      // Should still show validation for missing fields
      await expect(page.getByText('Conteúdo é obrigatório')).toBeVisible();
      await expect(page.getByText('Autor é obrigatório')).toBeVisible();
    });
  });

  test('should view post details and comments', async ({ page }) => {
    await test.step('Click on post to view details', async () => {
      const firstPost = page.getByText('Ver detalhes').first();
      await firstPost.click();
    });

    await test.step('Verify details modal opens', async () => {
      await expect(page.getByText('Detalhes do Post')).toBeVisible();
      await expect(page.getByText('sunt aut facere repellat provident')).toBeVisible();
      await expect(page.getByText('Comentários')).toBeVisible();
    });

    await test.step('Verify comments are loaded', async () => {
      await expect(page.getByText('id labore ex et quam laborum')).toBeVisible();
      await expect(page.getByText('Eliseo@gardner.biz')).toBeVisible();
    });

    await test.step('Close details modal', async () => {
      await page.getByRole('button', { name: /close|×|fechar/i }).first().click();
      await expect(page.getByText('Detalhes do Post')).not.toBeVisible();
    });
  });

  test('should edit post', async ({ page }) => {
    await test.step('Setup PUT mock', async () => {
      await page.route('**/jsonplaceholder.typicode.com/posts/*', async route => {
        if (route.request().method() === 'PUT') {
          const body = await route.request().postDataJSON();
          const postId = route.request().url().split('/').pop();
          await route.fulfill({ 
            json: { id: parseInt(postId), ...body } 
          });
        } else {
          await route.fulfill({ json: mockPosts[0] });
        }
      });
    });

    await test.step('Click edit button on first post', async () => {
      const editButton = page.getByText('Editar').first();
      await editButton.click();
    });

    await test.step('Verify edit modal opens and modify post', async () => {
      await expect(page.getByText('Editar Post')).toBeVisible();
      
      // Clear and fill new title
      await page.getByTestId('edit-post-title').clear();
      await page.getByTestId('edit-post-title').fill('Updated Post Title');
      
      await page.getByTestId('edit-post-submit').click();
    });

    await test.step('Verify post is updated', async () => {
      await expect(page.getByText('Post atualizado com sucesso!')).toBeVisible();
      await expect(page.getByText('Updated Post Title')).toBeVisible();
    });
  });

  test('should delete post', async ({ page }) => {
    await test.step('Setup DELETE mock', async () => {
      await page.route('**/jsonplaceholder.typicode.com/posts/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 200 });
        }
      });
    });

    await test.step('Click delete button on first post', async () => {
      const deleteButton = page.getByText('Excluir').first();
      await deleteButton.click();
    });

    await test.step('Confirm deletion', async () => {
      await expect(page.getByText('Confirmar exclusão')).toBeVisible();
      await page.getByText('Confirmar').click();
    });

    await test.step('Verify post is removed', async () => {
      await expect(page.getByText('Post excluído com sucesso!')).toBeVisible();
      
      // Post should be removed from the list
      await expect(page.getByText('sunt aut facere repellat provident')).not.toBeVisible();
    });
  });

  test('should handle pagination', async ({ page }) => {
    await test.step('Load initial posts', async () => {
      await expect(page.getByTestId('posts-list')).toBeVisible();
    });

    await test.step('Check pagination controls', async () => {
      const pagination = page.locator('[data-testid="posts-pagination"]');
      
      if (await pagination.isVisible()) {
        // Test pagination if there are enough posts
        const nextButton = pagination.locator('button').last();
        const prevButton = pagination.locator('button').first();
        
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await expect(page.getByText('Página 2')).toBeVisible();
          
          if (await prevButton.isEnabled()) {
            await prevButton.click();
            await expect(page.getByText('Página 1')).toBeVisible();
          }
        }
      }
    });
  });
});