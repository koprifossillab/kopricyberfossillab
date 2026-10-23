import os from 'node:os';
import path from 'node:path';

export const CLAUDE_HOME = process.env.FL_CLAUDE_HOME ?? path.join(os.homedir(), '.claude');
export const SESSIONS_DIR = path.join(CLAUDE_HOME, 'sessions');
export const JOBS_DIR = path.join(CLAUDE_HOME, 'jobs');
export const PROJECTS_DIR = path.join(CLAUDE_HOME, 'projects');
