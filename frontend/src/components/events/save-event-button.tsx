'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { getErrorMessage, toast } from '@/lib/toast-store';

/** Saves or removes one event for the signed-in user. Signed-out visitors are asked to sign in. */
export function SaveEventButton({ eventId, className = '' }: { eventId: number; className?: string }) {
  const queryClient = useQueryClient();

  const savedQuery = useQuery({
    queryKey: ['events', 'saved'],
    queryFn: () => eventsApi.saved(),
    retry: false,
  });

  const isSaved = (savedQuery.data ?? []).some((event) => event.id === eventId);

  const toggle = useMutation({
    mutationFn: () => (isSaved ? eventsApi.unsave(eventId) : eventsApi.save(eventId)),
    onSuccess: () => {
      toast.success(isSaved ? 'Removed from saved events.' : 'Saved to your events.');
      queryClient.invalidateQueries({ queryKey: ['events', 'saved'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'The event could not be saved.'), { title: 'Save failed' });
    },
  });

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      aria-pressed={isSaved}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
        isSaved
          ? 'border-black bg-black text-white hover:bg-zinc-800'
          : 'border-zinc-300 bg-white text-black hover:border-black'
      } ${className}`}
    >
      <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
      {isSaved ? 'Saved' : 'Save'}
    </button>
  );
}

export default SaveEventButton;
