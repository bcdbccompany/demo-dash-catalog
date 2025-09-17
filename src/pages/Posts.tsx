import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Eye, MessageCircle, User } from 'lucide-react';
import { httpClient } from '@/lib/http-client';
import { useDebounce } from '@/hooks/use-debounce';

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Comment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

const POSTS_PER_PAGE = 10;

export const Posts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    userId: '',
  });

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await httpClient.get<Post[]>(
        `https://jsonplaceholder.typicode.com/posts?_limit=${POSTS_PER_PAGE * 5}`
      );
      const data = 'data' in response ? response.data : response;
      setPosts(data);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Posts API error:', err);
      setError('Erro ao carregar posts.');
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const response = await httpClient.get<User[]>('https://jsonplaceholder.typicode.com/users');
      const data = 'data' in response ? response.data : response;
      setUsers(data);
    } catch (err) {
      console.error('Users API error:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchPostComments = async (postId: number) => {
    try {
      const response = await httpClient.get<Comment[]>(
        `https://jsonplaceholder.typicode.com/posts/${postId}/comments`
      );
      const data = 'data' in response ? response.data : response;
      setComments(data);
    } catch (err) {
      console.error('Comments API error:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchUsers();
  }, []);

  // Filter posts
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData({ title: '', body: '', userId: '' });
    setEditingPost(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.body.trim() || !formData.userId) {
      toast({
        title: "Erro de validação",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingPost) {
        // Update existing post
        const response = await httpClient.put(`https://jsonplaceholder.typicode.com/posts/${editingPost.id}`, {
          id: editingPost.id,
          title: formData.title,
          body: formData.body,
          userId: parseInt(formData.userId),
        });

        // Update posts list optimistically
        setPosts(posts.map(post => 
          post.id === editingPost.id 
            ? { ...post, title: formData.title, body: formData.body, userId: parseInt(formData.userId) }
            : post
        ));

        toast({
          title: "Post atualizado!",
          description: "O post foi atualizado com sucesso.",
        });
      } else {
        // Create new post
        const response = await httpClient.post('https://jsonplaceholder.typicode.com/posts', {
          title: formData.title,
          body: formData.body,
          userId: parseInt(formData.userId),
        });

        // Add new post to the beginning of the list with fake ID
        const newPost: Post = {
          id: 101, // Fake ID as specified
          title: formData.title,
          body: formData.body,
          userId: parseInt(formData.userId),
        };

        setPosts([newPost, ...posts]);

        toast({
          title: "Post publicado!",
          description: "O novo post foi criado com sucesso.",
        });
      }

      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o post.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      body: post.body,
      userId: post.userId.toString(),
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (post: Post) => {
    try {
      await httpClient.delete(`https://jsonplaceholder.typicode.com/posts/${post.id}`);
      
      // Remove from list optimistically
      setPosts(posts.filter(p => p.id !== post.id));
      
      toast({
        title: "Post excluído!",
        description: "O post foi excluído com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir o post.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = async (post: Post) => {
    setSelectedPost(post);
    setIsDetailOpen(true);
    await fetchPostComments(post.id);
  };

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.name || `Usuário ${userId}`;
  };

  const truncateText = (text: string, limit: number) => {
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  };

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Posts</h1>
          <ErrorState
            title="Erro ao carregar posts"
            message={error}
            onRetry={fetchPosts}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Posts</h1>
            <p className="text-muted-foreground">Gerencie e visualize todos os posts</p>
          </div>
          
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPost ? 'Editar Post' : 'Criar Novo Post'}
                </DialogTitle>
                <DialogDescription>
                  {editingPost ? 'Atualize as informações do post.' : 'Preencha os dados para criar um novo post.'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="post-form">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Digite o título do post"
                    data-testid="post-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Conteúdo *</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Digite o conteúdo do post"
                    rows={4}
                    data-testid="post-body"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Autor *</Label>
                  <Select 
                    value={formData.userId} 
                    onValueChange={(value) => setFormData({ ...formData, userId: value })}
                    data-testid="post-author"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isUsersLoading ? "Carregando..." : "Selecione um autor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" data-testid="post-submit">
                    {editingPost ? 'Atualizar' : 'Publicar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar posts por título..."
                className="pl-10"
                data-testid="posts-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* Posts List */}
        {isLoading ? (
          <LoadingState type="cards" rows={POSTS_PER_PAGE} />
        ) : paginatedPosts.length === 0 ? (
          <EmptyState
            icon="search"
            title="Nenhum post encontrado"
            message={searchTerm ? "Nenhum post corresponde à sua busca." : "Ainda não há posts para exibir."}
          />
        ) : (
          <div className="space-y-4" data-testid="posts-list">
            {paginatedPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {post.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <User className="w-4 h-4" />
                        {getUserName(post.userId)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(post)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalhes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(post)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(post)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {truncateText(post.body, 200)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}

        {/* Post Details Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {selectedPost && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedPost.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Por {getUserName(selectedPost.userId)}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Conteúdo:</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedPost.body}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Comentários ({comments.length})
                    </h3>
                    
                    {comments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhum comentário ainda.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {comments.slice(0, 5).map((comment) => (
                          <div key={comment.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{comment.name}</span>
                              <Badge variant="outline">{comment.email}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {comment.body}
                            </p>
                          </div>
                        ))}
                        {comments.length > 5 && (
                          <p className="text-sm text-muted-foreground text-center">
                            E mais {comments.length - 5} comentários...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};