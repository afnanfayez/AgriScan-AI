import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listCommentsForPost, listPosts, toggleLike, addComment, createPost } from '@/services/community-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const postId = searchParams.get('postId');

    await getSessionUser();
    const supabase = await createClient();

    // If requesting comments for a specific post
    if (postId) {
      const comments = await listCommentsForPost(supabase, postId);
      return NextResponse.json({ success: true, comments });
    }

    // Else listing posts
    const posts = await listPosts(supabase, category);
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error('Get community error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const supabase = await createClient();

    // 1. Like action
    if (body.action === 'like') {
      const post = await toggleLike(supabase, user, body.postId);
      return NextResponse.json({ success: true, post });
    }

    // 2. Add Comment action
    if (body.action === 'comment') {
      const { postId, content } = body;
      if (!postId || !content) {
        return NextResponse.json({ error: 'Post ID and content are required' }, { status: 400 });
      }
      const comment = await addComment(supabase, user, { postId, content });
      return NextResponse.json({ success: true, comment });
    }

    // 3. Create Post action
    const { title, content, category } = body;
    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Title, content and category are required' }, { status: 400 });
    }

    const post = await createPost(supabase, user, { title, content, category });
    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error('Post community error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
