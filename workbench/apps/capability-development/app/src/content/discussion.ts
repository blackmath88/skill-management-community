/**
 * The scripted counterpart for rehearsing the opening of a difficult team discussion.
 *
 * Fiction, authored and fixed in advance: nobody is being simulated and nothing adapts to the
 * person. It is deliberately generic — a colleague who is short on time and not convinced — so it
 * fits a discussion about priorities as well as one about ownership. Used only where an activity
 * has no authored rehearsal of its own.
 */
import type { RehearsalScript } from './types'

export const DISCUSSION_REHEARSAL: RehearsalScript = {
  role: 'a colleague in the discussion who is short on time and not convinced there is a problem',
  opening: 'We have ten minutes before I have to go. What is this about?',
  lines: [
    'I am not sure I see the issue. This has worked well enough so far, has it not?',
    'And what exactly are you asking of me — or of the team?',
    'I will need to think about it. What happens if we simply leave it as it is?',
  ],
  note: 'Invented lines, the same every time. A rehearsal checks that your words are ready; it predicts nothing about the real conversation.',
}
