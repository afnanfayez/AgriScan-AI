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

const staticPostsFallback: ForumPost[] = [
  {
    id: 'post-static-1',
    title: 'Welcome to AgriScan AI Forum!',
    content: 'Share pictures of your crop foliage, discuss organic pest control remedies, and connect with certified agronomists here!',
    userId: 'admin-id',
    authorName: 'AgriScan Pathologist',
    category: 'General',
    likes: ['user-like-1', 'user-like-2'],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'post-static-2',
    title: 'Help! Spotted lesions on my Golden Jubilee Tomato leaves',
    content: 'I noticed small brown spots with concentric rings on my lower tomato leaves. Is this early blight or nutrient deficiency?',
    userId: 'user-id-2',
    authorName: 'Alex Mercer (Gardener)',
    category: 'Diseases',
    likes: ['user-like-1'],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'post-static-3',
    title: 'Certified Organic Neem Oil spray recipe',
    content: 'Mix 1.5 teaspoons of pure cold-pressed neem oil with 1/2 teaspoon of mild organic liquid soap in 1 quart of warm water. Spray leaves thoroughly!',
    userId: 'user-id-3',
    authorName: 'Dr. Helen Peterson',
    category: 'QA',
    likes: ['user-like-1', 'user-like-2', 'user-like-3'],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const staticCommentsFallback: Record<string, ForumComment[]> = {
  'post-static-2': [
    {
      id: 'cmt-static-1',
      postId: 'post-static-2',
      content: 'Concentric rings suggest Early Blight (Alternaria solani). Cut away the lowest yellowed leaves immediately and keep them off the soil!',
      userId: 'expert-id-1',
      authorName: 'Dr. Helen Peterson',
      createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
  ],
};

export async function listCommentsForPost(supabase: SupabaseClient, postId: string): Promise<ForumComment[]> {
  const { data: commentsData } = await supabase
    .from('forum_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  let comments = (commentsData || []).map(mapComment);

  if (comments.length === 0 && staticCommentsFallback[postId]) {
    comments = staticCommentsFallback[postId];
  }

  return comments;
}

export async function listPosts(supabase: SupabaseClient, category?: string | null): Promise<ForumPost[]> {
  let query = supabase.from('forum_posts').select('*');
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data: postsData, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching forum posts:', error);
    return staticPostsFallback;
  }

  let posts = (postsData || []).map(mapPost);

  if (posts.length === 0) {
    posts = staticPostsFallback;
    if (category && category !== 'all') {
      posts = posts.filter((p) => p.category === category);
    }
  }

  return posts;
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
