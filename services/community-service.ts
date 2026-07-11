import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { ForumPost, ForumComment } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapPost = (p: any): ForumPost => ({
  id: p.id,
  userId: p.user_id,
  authorName: p.author_name,
  title: p.title,
  content: p.content,
  category: p.category,
  likes: p.likes || [],
  createdAt: p.created_at,
});

const mapComment = (c: any): ForumComment => ({
  id: c.id,
  postId: c.post_id,
  userId: c.user_id,
  authorName: c.author_name,
  content: c.content,
  createdAt: c.created_at,
});

export async function listCommentsForPost(supabase: SupabaseClient, postId: string): Promise<ForumComment[]> {
  const { data: commentsData, error } = await supabase
    .from('forum_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching forum comments:', error);
    throw new ServiceError(error.message, 500);
  }

  return (commentsData || []).map(mapComment);
}

export async function listPosts(supabase: SupabaseClient, category?: string | null): Promise<ForumPost[]> {
  let query = supabase.from('forum_posts').select('*');
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data: postsData, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching forum posts:', error);
    throw new ServiceError(error.message, 500);
  }

  return (postsData || []).map(mapPost);
}

export async function toggleLike(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  postId: string
): Promise<ForumPost> {
  const { data: post, error: fetchError } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    throw new ServiceError('Post not found', 404);
  }

  let likes = post.likes || [];
  const userLikeIndex = likes.indexOf(user.id);
  if (userLikeIndex > -1) {
    likes.splice(userLikeIndex, 1); // Unlike
  } else {
    likes.push(user.id); // Like
  }

  const { data: updatedPost, error: updateError } = await supabase
    .from('forum_posts')
    .update({ likes })
    .eq('id', postId)
    .select()
    .single();

  if (updateError || !updatedPost) {
    console.error('Error liking post:', updateError);
    throw new ServiceError('Failed to update likes', 400);
  }

  return mapPost(updatedPost);
}

export async function addComment(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { postId: string; content: string }
): Promise<ForumComment> {
  const { data: newComment, error: commentError } = await supabase
    .from('forum_comments')
    .insert({
      post_id: input.postId,
      user_id: user.id,
      author_name: user.name,
      content: input.content,
    })
    .select()
    .single();

  if (commentError || !newComment) {
    console.error('Error creating comment:', commentError);
    throw new ServiceError(commentError?.message || 'Failed to post comment', 400);
  }

  return mapComment(newComment);
}

export async function createPost(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { title: string; content: string; category: string }
): Promise<ForumPost> {
  const { data: newPost, error: postError } = await supabase
    .from('forum_posts')
    .insert({
      user_id: user.id,
      author_name: user.name,
      title: input.title,
      content: input.content,
      category: input.category,
      likes: [],
    })
    .select()
    .single();

  if (postError || !newPost) {
    console.error('Error creating post:', postError);
    throw new ServiceError(postError?.message || 'Failed to create post', 400);
  }

  return mapPost(newPost);
}
