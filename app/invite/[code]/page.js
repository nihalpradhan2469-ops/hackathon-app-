'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';

export default function InvitePage() {
  const { code } = useParams();
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinResult, setJoinResult] = useState(null);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/teams/invite/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setTeamData(data);
        }
      })
      .catch(() => setError('Failed to load invite'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/teams/invite/${code}/join`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setJoinResult({ success: false, message: data.error });
      } else {
        setJoinResult({ success: true, message: 'You have joined the team!' });
        // Refresh team data
        const updated = await fetch(`/api/teams/invite/${code}`).then(r => r.json());
        if (!updated.error) setTeamData(updated);
      }
    } catch {
      setJoinResult({ success: false, message: 'Failed to join team' });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingPulse}></div>
          <p style={styles.loadingText}>Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>❌</div>
          <h1 style={styles.errorTitle}>Invalid Invite</h1>
          <p style={styles.errorText}>{error}</p>
          <button onClick={() => router.push('/')} style={styles.homeButton}>
            Go to HackRadar
          </button>
        </div>
      </div>
    );
  }

  const { team, hackathonName } = teamData;
  const isFull = team.members.length >= team.maxSize;
  const alreadyMember = isSignedIn && team.members.some(m => m.userId === user?.id);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>HR</div>
          <h3 style={styles.brandText}>HackRadar</h3>
        </div>

        <div style={styles.divider}></div>

        {/* Team Info */}
        <div style={styles.inviteBadge}>🤝 Team Invite</div>
        <h1 style={styles.teamName}>{team.name}</h1>
        <p style={styles.hackathonLabel}>For: <span style={styles.hackathonName}>{hackathonName}</span></p>
        <p style={styles.description}>{team.description}</p>

        {/* Skills */}
        {team.skillsNeeded && team.skillsNeeded.length > 0 && (
          <div style={styles.skillsRow}>
            {team.skillsNeeded.map(s => (
              <span key={s} style={styles.skillBadge}>{s}</span>
            ))}
          </div>
        )}

        {/* Members */}
        <div style={styles.membersSection}>
          <p style={styles.membersTitle}>
            Team Members ({team.members.length}/{team.maxSize})
          </p>
          <div style={styles.membersList}>
            {team.members.map(m => (
              <div key={m.userId} style={styles.memberChip}>
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} style={styles.memberAvatar} />
                ) : (
                  <div style={styles.memberAvatarPlaceholder}>
                    {m.name?.[0] || '?'}
                  </div>
                )}
                <span style={styles.memberName}>{m.name}</span>
                {m.role === 'leader' && <span style={styles.leaderBadge}>Leader</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.divider}></div>

        {/* Actions */}
        {joinResult ? (
          <div style={{
            ...styles.resultBox,
            borderColor: joinResult.success ? '#22c55e' : '#ef4444',
            backgroundColor: joinResult.success ? '#f0fdf4' : '#fef2f2',
          }}>
            <span style={{ fontSize: '24px' }}>{joinResult.success ? '✅' : '⚠️'}</span>
            <p style={{
              ...styles.resultText,
              color: joinResult.success ? '#15803d' : '#dc2626',
            }}>{joinResult.message}</p>
            {joinResult.success && (
              <button onClick={() => router.push('/')} style={styles.goButton}>
                Go to Dashboard →
              </button>
            )}
          </div>
        ) : !isLoaded ? (
          <p style={styles.loadingText}>Loading...</p>
        ) : !isSignedIn ? (
          <div style={styles.signInBox}>
            <p style={styles.signInText}>Sign in to join this team</p>
            <SignInButton mode="modal" forceRedirectUrl={`/invite/${code}`}>
              <button style={styles.joinButton}>Sign In & Join</button>
            </SignInButton>
          </div>
        ) : alreadyMember ? (
          <div style={styles.resultBox}>
            <span style={{ fontSize: '24px' }}>✅</span>
            <p style={{ ...styles.resultText, color: '#15803d' }}>You're already a member of this team!</p>
            <button onClick={() => router.push('/')} style={styles.goButton}>
              Go to Dashboard →
            </button>
          </div>
        ) : isFull ? (
          <div style={styles.fullBox}>
            <p style={styles.fullText}>This team is full ({team.maxSize}/{team.maxSize} members)</p>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              ...styles.joinButton,
              opacity: joining ? 0.7 : 1,
              cursor: joining ? 'not-allowed' : 'pointer',
            }}
          >
            {joining ? 'Joining...' : `Join "${team.name}"`}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1035 50%, #0f172a 100%)',
    padding: '20px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: 'rgba(30, 20, 60, 0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(124, 58, 237, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  logo: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #7c3aed, #c026d3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    lineHeight: '36px',
  },
  brandText: {
    color: '#e2e8f0',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  divider: {
    height: '1px',
    background: 'rgba(139, 92, 246, 0.15)',
    margin: '16px 0',
  },
  inviteBadge: {
    display: 'inline-block',
    background: 'rgba(124, 58, 237, 0.15)',
    color: '#a78bfa',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '16px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
  },
  teamName: {
    color: 'white',
    fontSize: '28px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  hackathonLabel: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: '0 0 12px 0',
  },
  hackathonName: {
    color: '#a78bfa',
    fontWeight: '600',
  },
  description: {
    color: '#cbd5e1',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0 0 20px 0',
  },
  skillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  skillBadge: {
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
  membersSection: {
    background: 'rgba(15, 10, 30, 0.5)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '8px',
  },
  membersTitle: {
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0 0 12px 0',
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  memberChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(30, 20, 60, 0.6)',
    padding: '8px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(139, 92, 246, 0.1)',
  },
  memberAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(124, 58, 237, 0.3)',
  },
  memberAvatarPlaceholder: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #c026d3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '12px',
    lineHeight: '28px',
  },
  memberName: {
    color: '#e2e8f0',
    fontSize: '14px',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  leaderBadge: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '700',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  joinButton: {
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #7c3aed, #c026d3)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    letterSpacing: '0.3px',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
  },
  signInBox: {
    textAlign: 'center',
  },
  signInText: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '12px',
  },
  resultBox: {
    border: '1px solid',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: 'rgba(15, 10, 30, 0.5)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  resultText: {
    fontSize: '15px',
    fontWeight: '600',
    margin: '8px 0 16px 0',
  },
  goButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #7c3aed, #c026d3)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  fullBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  fullText: {
    color: '#f87171',
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
  },
  homeButton: {
    marginTop: '16px',
    padding: '10px 24px',
    background: 'rgba(124, 58, 237, 0.2)',
    color: '#a78bfa',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingPulse: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '3px solid rgba(124, 58, 237, 0.2)',
    borderTopColor: '#7c3aed',
    margin: '0 auto 16px auto',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    color: '#f87171',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  errorText: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: '0 0 20px 0',
  },
};
