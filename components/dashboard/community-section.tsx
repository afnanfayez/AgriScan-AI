'use client';

import { motion } from 'motion/react';
import type React from 'react';
import { Heart, Loader2, MessageSquare, Plus, Send, Users } from 'lucide-react';

interface CommunitySectionProps {
  posts: any[];
  postsLoading: boolean;
  userId: string;
  communityCategory: 'all' | 'Diseases' | 'Tips' | 'General' | 'Farming Tech';
  activePostComments: any[];
  activePostIdForComments: string | null;
  newCommentText: string;
  onCategoryChange: (category: any) => void;
  onShowAddPost: () => void;
  onLikePost: (postId: string) => void;
  onFetchComments: (postId: string) => void;
  onCommentTextChange: (value: string) => void;
  onAddComment: (event: React.FormEvent) => void;
}

const categories = ['all', 'Diseases', 'Tips', 'General', 'Farming Tech'];

export default function CommunitySection({
  posts,
  postsLoading,
  userId,
  communityCategory,
  activePostComments,
  activePostIdForComments,
  newCommentText,
  onCategoryChange,
  onShowAddPost,
  onLikePost,
  onFetchComments,
  onCommentTextChange,
  onAddComment,
}: CommunitySectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Crop Pathologist Forum</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500 dark:text-slate-400">
            Share observations, treatment notes, and field lessons with growers managing similar plant health issues.
          </p>
        </div>
        <button
          onClick={onShowAddPost}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          <span>Create Thread</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-3 dark:border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                  communityCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                    : 'border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {cat === 'all' ? 'All Threads' : cat}
              </button>
            ))}
          </div>

          {postsLoading ? (
            <div className="flex justify-center rounded-2xl border border-stone-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center sm:p-12 dark:border-slate-800 dark:bg-slate-900">
              <MessageSquare className="mx-auto h-9 w-9 text-stone-300 dark:text-slate-600" />
              <h3 className="mt-4 text-base font-bold text-stone-900 dark:text-slate-50">No threads here yet</h3>
              <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">Start the first discussion in this category.</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-200 sm:p-5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      {post.category}
                    </span>
                    <h3 className="mt-3 text-base font-bold leading-snug text-stone-900 dark:text-slate-50">{post.title}</h3>
                    <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                      Started by <span className="font-semibold text-stone-700 dark:text-slate-200">{post.authorName}</span> on {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <p className="mt-4 rounded-xl border border-stone-100 bg-stone-50/70 p-4 text-sm leading-relaxed text-stone-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  {post.content}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3 text-xs dark:border-slate-800">
                  <button
                    onClick={() => onLikePost(post.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
                      post.likes.includes(userId)
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    }`}
                  >
                    <Heart className="h-4 w-4" />
                    <span>{post.likes.length} Likes</span>
                  </button>
                  <button
                    onClick={() => onFetchComments(post.id)}
                    className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{post.replyCount || 0} Replies</span>
                  </button>
                </div>

                {activePostIdForComments === post.id && (
                  <div className="mt-4 space-y-4 border-t border-stone-100 pt-4 dark:border-slate-800">
                    <div className="space-y-3 border-l-2 border-emerald-100 pl-3 sm:pl-4 dark:border-emerald-500/20">
                      {activePostComments.length === 0 ? (
                        <p className="text-xs text-stone-400 dark:text-slate-500">No replies yet. Add the first field note.</p>
                      ) : (
                        activePostComments.map((comment) => (
                          <div key={comment.id} className="rounded-xl border border-stone-100 bg-stone-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                            <p className="font-semibold text-emerald-800 dark:text-emerald-300">{comment.authorName}</p>
                            <p className="mt-1 leading-relaxed text-stone-700 dark:text-slate-300">{comment.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={onAddComment} className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        required
                        value={newCommentText}
                        onChange={(event) => onCommentTextChange(event.target.value)}
                        placeholder="Write a practical response..."
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                      <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white dark:bg-emerald-600">
                        <Send className="h-3.5 w-3.5" />
                        Reply
                      </button>
                    </form>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        <aside className="self-start rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4 dark:border-slate-800">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-slate-50">Reference Desk</h3>
              <p className="text-xs text-stone-500 dark:text-slate-400">Common topics in this community.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { name: 'Tomato Late Blight', detail: 'P. infestans reference' },
              { name: 'Powdery Mildew', detail: 'Erysiphales reference' },
              { name: 'Black Spot Roses', detail: 'D. rosae reference' },
              { name: 'Root Rot Pythium', detail: 'P. ultimum reference' },
              { name: 'Fire Blight Pear', detail: 'E. amylovora reference' },
            ].map((disease) => (
              <div key={disease.name} className="rounded-xl border border-stone-100 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <h4 className="text-xs font-bold text-stone-900 dark:text-slate-100">{disease.name}</h4>
                <p className="mt-1 text-[10px] text-stone-400 dark:text-slate-500">{disease.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
