#!/usr/bin/env python
import os, subprocess

REPO_ROOT = '/git-repos/'
REPOS = ['sqlalchemy', ]
DEVNULL = open(os.devnull, 'w')

def _call_suppressed(*args, **kwargs):
    kwargs.update({
        'cwd': os.path.join(REPO_ROOT, kwargs.pop('repo')),
        'stdout': DEVNULL,
        'stderr': DEVNULL
    })
    return subprocess.check_call(*args, **kwargs)

def pull(repo):
    """Runs `git svn rebase` (as a subprocess) on the repo. Suppresses any
       output"""
    _call_suppressed(['git', 'svn', 'fetch'], repo=repo)
    _call_suppressed(['git', 'checkout', 'master'], repo=repo)
    _call_suppressed(['git', 'rebase', 'trunk'], repo=repo)

def create_local_branches(repo):
    """Checks for any new remote branches (from svn), and creates local counterparts
       if necessary."""
    remote_branches = subprocess.Popen(
        ['git', 'branch', '-r'],
        cwd=os.path.join(REPO_ROOT, repo),
        stdout=subprocess.PIPE
    ).communicate()[0]
    local_branches = subprocess.Popen(
        ['git', 'branch'],
        cwd=os.path.join(REPO_ROOT, repo),
        stdout=subprocess.PIPE
    ).communicate()[0]
    remote_branches = set([b.strip() for b in remote_branches.split('\n')])
    local_branches = set([b.strip() for b in local_branches.split('\n')])
    for branch in remote_branches.difference(local_branches):
        if branch in ('trunk', ):
            continue
        elif branch.count('/'):
            # Ignore unless a new tag is to be created
            if not branch.startswith('tags/'):
                continue
            # ...which it is
            else:
                branch = branch[5:]
                _call_suppressed(['git', 'tag', '-a', '-m', 'Tagging svn tag %s' % branch, branch], repo=repo)
                continue
        else:
            _call_suppressed(['git', 'branch', branch], repo=repo)

def push(repo):
    """Pushes everything to GitHub."""
    _call_suppressed(['git', 'push', 'gh', '--all', '--force'], repo=repo)
    _call_suppressed(['git', 'push', 'gh', '--tags', '--force'], repo=repo)

if __name__ == '__main__':
    for repo in REPOS:
        pull(repo)
        create_local_branches(repo)
        push(repo)
