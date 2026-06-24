import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getCollections } from '@/lib/mongo';
import { SEED_HACKATHONS } from '@/lib/seedHackathons';
import { runAllScrapers } from '@/lib/scrapers';
import { currentUser } from '@clerk/nextjs/server';
import { sendNewHackathonAlert, sendWeeklyDigest, sendTeamInvite } from '@/lib/email';

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex');
}

export const dynamic = 'force-dynamic';

async function ensureSeed() {
  const { hackathons } = await getCollections();
  const count = await hackathons.countDocuments();
  if (count === 0) {
    await hackathons.insertMany(SEED_HACKATHONS);
    return { seeded: SEED_HACKATHONS.length };
  }
  return { seeded: 0, existing: count };
}

function stripId(d) { if (!d) return d; const { _id, ...rest } = d; return rest; }

// ---------- GET ----------
export async function GET(req, { params }) {
  const segs = (await params).path || [];
  const url = new URL(req.url);
  try {
    if (segs.length === 0 || segs[0] === 'health') {
      return NextResponse.json({ status: 'ok', service: 'HackRadar API' });
    }

    if (segs[0] === 'hackathons') {
      await ensureSeed();
      const { hackathons } = await getCollections();

      if (segs[1]) {
        const h = await hackathons.findOne({ id: segs[1] });
        if (!h) return NextResponse.json({ error: 'not found' }, { status: 404 });
        return NextResponse.json(stripId(h));
      }

      const q = url.searchParams.get('q')?.toLowerCase() || '';
      const themes = url.searchParams.getAll('theme');
      const mode = url.searchParams.get('mode'); // online|offline|hybrid
      const minPrize = Number(url.searchParams.get('minPrize') || 0);
      const maxPrize = Number(url.searchParams.get('maxPrize') || 0);
      const deadlineDays = Number(url.searchParams.get('deadlineDays') || 0);
      const beginner = url.searchParams.get('beginnerFriendly') === 'true';
      const studentOnly = url.searchParams.get('studentOnly') === 'true';
      const solo = url.searchParams.get('solo') === 'true';
      const team = url.searchParams.get('team') === 'true';
      const delhiNcr = url.searchParams.get('delhiNcr') === 'true';
      const sort = url.searchParams.get('sort') || 'deadline'; // deadline|prize|trending|new
      const limit = Math.min(Number(url.searchParams.get('limit') || 100), 200);

      const filter = {};
      if (mode) filter.mode = mode;
      if (themes.length) filter.themes = { $in: themes };
      if (beginner) filter.beginnerFriendly = true;
      if (studentOnly) filter.studentOnly = true;
      if (solo) filter['teamSize.min'] = 1;
      if (team) filter['teamSize.max'] = { $gte: 2 };
      if (delhiNcr) filter.location = /delhi/i;
      if (minPrize > 0 || maxPrize > 0) {
        filter.prizePool = {};
        if (minPrize > 0) filter.prizePool.$gte = minPrize;
        if (maxPrize > 0) filter.prizePool.$lte = maxPrize;
      }
      if (deadlineDays > 0) {
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + deadlineDays);
        filter.registrationDeadline = { $lte: cutoff.toISOString(), $gte: new Date().toISOString() };
      }

      let cursor = hackathons.find(filter);
      let docs = await cursor.toArray();

      if (q) {
        docs = docs.filter(d =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.organizer || '').toLowerCase().includes(q) ||
          (d.description || '').toLowerCase().includes(q) ||
          (d.themes || []).some(t => t.toLowerCase().includes(q)) ||
          (d.location || '').toLowerCase().includes(q)
        );
      }

      if (sort === 'prize') docs.sort((a, b) => (b.prizePool || 0) - (a.prizePool || 0));
      else if (sort === 'trending') docs.sort((a, b) => (b.saves || 0) - (a.saves || 0));
      else if (sort === 'new') docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      else docs.sort((a, b) => new Date(a.registrationDeadline) - new Date(b.registrationDeadline));

      return NextResponse.json({ count: docs.length, hackathons: docs.slice(0, limit).map(stripId) });
    }

    if (segs[0] === 'stats') {
      await ensureSeed();
      const { hackathons } = await getCollections();
      const all = await hackathons.find({}).toArray();
      const nowIso = new Date().toISOString();
      const weekIso = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString(); })();
      const monthAgoIso = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString(); })();
      const active = all.filter(h => h.registrationDeadline >= nowIso);
      const closingThisWeek = active.filter(h => h.registrationDeadline <= weekIso);
      const missed = all.filter(h => h.registrationDeadline < nowIso && h.registrationDeadline >= monthAgoIso);
      const totalPrize = active.reduce((s, h) => s + (h.prizePool || 0), 0);
      const missedPrize = missed.reduce((s, h) => s + (h.prizePool || 0), 0);
      return NextResponse.json({
        activeCount: active.length,
        totalPrize,
        closingThisWeekCount: closingThisWeek.length,
        closingThisWeek: closingThisWeek.slice(0, 5).map(stripId),
        missedCount: missed.length,
        missedPrize,
        sources: Array.from(new Set(all.map(h => h.source))),
      });
    }

    if (segs[0] === 'saved') {
      const sid = url.searchParams.get('sid') || url.searchParams.get('userId');
      if (!sid) return NextResponse.json({ hackathons: [] });
      const { saved, hackathons } = await getCollections();
      const rows = await saved.find({ sid }).toArray();
      const ids = rows.map(r => r.hackathonId);
      const docs = await hackathons.find({ id: { $in: ids } }).toArray();
      return NextResponse.json({ count: docs.length, hackathons: docs.map(stripId) });
    }

    if (segs[0] === 'trending') {
      await ensureSeed();
      const { hackathons } = await getCollections();
      const docs = await hackathons.find({
        registrationDeadline: { $gte: new Date().toISOString() },
      }).sort({ saves: -1 }).limit(8).toArray();
      return NextResponse.json({ hackathons: docs.map(stripId) });
    }

    if (segs[0] === 'scrape') {
      const items = await runAllScrapers();
      const { hackathons, scrapeRuns } = await getCollections();
      let inserted = 0;
      const newHackathons = [];
      for (const item of items) {
        const ex = await hackathons.findOne({ name: item.name, organizer: item.organizer });
        if (!ex) {
          await hackathons.insertOne(item);
          newHackathons.push(item);
          inserted++;
        }
      }
      await scrapeRuns.insertOne({
        id: uuid(),
        ranAt: new Date().toISOString(),
        fetched: items.length,
        inserted,
      });

      if (newHackathons.length > 0) {
        try {
          const { alerts } = await getCollections();
          const activeAlerts = await alerts.find({ enabled: true, type: 'instant' }).toArray();
          for (const alert of activeAlerts) {
            const matching = newHackathons.filter(h => {
              const filters = alert.filters || {};
              if (filters.themes && filters.themes.length > 0) {
                const hasTheme = h.themes && h.themes.some(t => filters.themes.includes(t));
                if (!hasTheme) return false;
              }
              if (filters.minPrize > 0 && (h.prizePool || 0) < filters.minPrize) {
                return false;
              }
              if (filters.mode && h.mode !== filters.mode) {
                return false;
              }
              if (filters.beginnerFriendly && !h.beginnerFriendly) {
                return false;
              }
              return true;
            });

            if (matching.length > 0) {
              await sendNewHackathonAlert(alert.email, matching);
            }
          }
        } catch (err) {
          console.error('Failed to match alerts:', err);
        }
      }
      return NextResponse.json({ ok: true, fetched: items.length, inserted });
    }

    if (segs[0] === 'users' && segs[1] === 'me') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { users } = await getCollections();
      let dbUser = await users.findOne({ clerkId: user.id });
      if (!dbUser) {
        dbUser = {
          clerkId: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
          email: user.emailAddresses[0]?.emailAddress || '',
          avatar: user.imageUrl || '',
          skills: [],
          bio: '',
          github: '',
          linkedin: '',
          lookingForTeam: false,
          createdAt: new Date().toISOString(),
        };
        await users.insertOne(dbUser);
      }
      return NextResponse.json(dbUser);
    }

    if (segs[0] === 'users' && segs[1] === 'teammates') {
      const { users } = await getCollections();
      const docs = await users.find({ lookingForTeam: true }).toArray();
      return NextResponse.json({ count: docs.length, teammates: docs.map(stripId) });
    }

    // GET /api/teams/invite/[code] — lookup team by invite code
    if (segs[0] === 'teams' && segs[1] === 'invite' && segs[2]) {
      const inviteCode = segs[2];
      const { teams, users, hackathons } = await getCollections();
      const team = await teams.findOne({ inviteCode });
      if (!team) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });
      const hackathon = await hackathons.findOne({ id: team.hackathonId });
      if (team.members && team.members.length) {
        const userIds = team.members.map(m => m.userId);
        const memberProfiles = await users.find({ clerkId: { $in: userIds } }).toArray();
        team.members = team.members.map(m => {
          const profile = memberProfiles.find(p => p.clerkId === m.userId);
          return { ...m, name: profile?.name || 'Anonymous Developer', avatar: profile?.avatar || '' };
        });
      }
      return NextResponse.json({ team: stripId(team), hackathonName: hackathon?.name || 'Hackathon' });
    }

    if (segs[0] === 'teams') {
      const hackathonId = url.searchParams.get('hackathonId');
      const { teams, users } = await getCollections();
      const query = {};
      if (hackathonId) query.hackathonId = hackathonId;
      const docs = await teams.find(query).toArray();
      
      for (const team of docs) {
        if (team.members && team.members.length) {
          const userIds = team.members.map(m => m.userId);
          const memberProfiles = await users.find({ clerkId: { $in: userIds } }).toArray();
          team.members = team.members.map(m => {
            const profile = memberProfiles.find(p => p.clerkId === m.userId);
            return {
              ...m,
              name: profile?.name || 'Anonymous Developer',
              avatar: profile?.avatar || '',
              skills: profile?.skills || [],
              bio: profile?.bio || '',
              github: profile?.github || '',
              linkedin: profile?.linkedin || '',
            };
          });
        }
      }
      return NextResponse.json({ count: docs.length, teams: docs.map(stripId) });
    }

    if (segs[0] === 'alerts') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { alerts } = await getCollections();
      let alertPref = await alerts.findOne({ userId: user.id });
      if (!alertPref) {
        alertPref = {
          userId: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          type: 'weekly',
          filters: {
            themes: [],
            minPrize: 0,
            mode: '',
            beginnerFriendly: false,
          },
          enabled: false,
          createdAt: new Date().toISOString(),
        };
        await alerts.insertOne(alertPref);
      }
      return NextResponse.json(stripId(alertPref));
    }

    return NextResponse.json({ error: 'route not found' }, { status: 404 });
  } catch (e) {
    console.error('GET error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ---------- POST ----------
export async function POST(req, { params }) {
  const segs = (await params).path || [];
  try {
    if (segs[0] === 'saved') {
      const body = await req.json();
      const { sid, userId, hackathonId } = body;
      const idToUse = sid || userId;
      if (!idToUse || !hackathonId) return NextResponse.json({ error: 'sid or userId + hackathonId required' }, { status: 400 });
      const { saved, hackathons } = await getCollections();
      const exists = await saved.findOne({ sid: idToUse, hackathonId });
      if (!exists) {
        await saved.insertOne({ id: uuid(), sid: idToUse, hackathonId, createdAt: new Date().toISOString() });
        await hackathons.updateOne({ id: hackathonId }, { $inc: { saves: 1 } });
      }
      return NextResponse.json({ ok: true });
    }

    if (segs[0] === 'scrape') {
      const items = await runAllScrapers();
      const { hackathons, scrapeRuns } = await getCollections();
      let inserted = 0;
      const newHackathons = [];
      for (const item of items) {
        const ex = await hackathons.findOne({ name: item.name, organizer: item.organizer });
        if (!ex) {
          await hackathons.insertOne(item);
          newHackathons.push(item);
          inserted++;
        }
      }
      await scrapeRuns.insertOne({
        id: uuid(),
        ranAt: new Date().toISOString(),
        fetched: items.length,
        inserted,
      });

      if (newHackathons.length > 0) {
        try {
          const { alerts } = await getCollections();
          const activeAlerts = await alerts.find({ enabled: true, type: 'instant' }).toArray();
          for (const alert of activeAlerts) {
            const matching = newHackathons.filter(h => {
              const filters = alert.filters || {};
              if (filters.themes && filters.themes.length > 0) {
                const hasTheme = h.themes && h.themes.some(t => filters.themes.includes(t));
                if (!hasTheme) return false;
              }
              if (filters.minPrize > 0 && (h.prizePool || 0) < filters.minPrize) {
                return false;
              }
              if (filters.mode && h.mode !== filters.mode) {
                return false;
              }
              if (filters.beginnerFriendly && !h.beginnerFriendly) {
                return false;
              }
              return true;
            });

            if (matching.length > 0) {
              await sendNewHackathonAlert(alert.email, matching);
            }
          }
        } catch (err) {
          console.error('Failed to match alerts:', err);
        }
      }
      return NextResponse.json({ ok: true, fetched: items.length, inserted });
    }

    if (segs[0] === 'seed' && segs[1] === 'reset') {
      const { hackathons } = await getCollections();
      await hackathons.deleteMany({});
      await hackathons.insertMany(SEED_HACKATHONS);
      return NextResponse.json({ ok: true, count: SEED_HACKATHONS.length });
    }

    if (segs[0] === 'hackathons') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized. Please login to submit a hackathon.' }, { status: 401 });

      const body = await req.json();
      const {
        name,
        organizer,
        description,
        prizePool,
        minTeam,
        maxTeam,
        location,
        registrationDeadline,
        registrationLink,
        themes,
        mode,
        beginnerFriendly,
        studentOnly
      } = body;

      if (!name || !organizer || !description || !registrationDeadline || !registrationLink) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const { hackathons } = await getCollections();
      const newHackathon = {
        id: uuid(),
        name,
        organizer,
        description,
        prizePool: Number(prizePool || 0),
        teamSize: {
          min: Number(minTeam || 1),
          max: Number(maxTeam || 4)
        },
        location: location || 'Online',
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        registrationLink,
        themes: Array.isArray(themes) ? themes : [],
        source: 'Local',
        mode: mode || 'online',
        beginnerFriendly: !!beginnerFriendly,
        studentOnly: !!studentOnly,
        saves: 0,
        createdAt: new Date().toISOString()
      };

      await hackathons.insertOne(newHackathon);
      return NextResponse.json({ ok: true, hackathon: stripId(newHackathon) });
    }

    if (segs[0] === 'users' && segs[1] === 'me') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      const { skills, bio, github, linkedin, lookingForTeam } = body;
      const { users } = await getCollections();
      await users.updateOne(
        { clerkId: user.id },
        {
          $set: {
            skills: skills || [],
            bio: bio || '',
            github: github || '',
            linkedin: linkedin || '',
            lookingForTeam: !!lookingForTeam,
            updatedAt: new Date().toISOString(),
          }
        }
      );
      return NextResponse.json({ ok: true });
    }

    // POST /api/teams/invite/[code]/join — join team via invite code
    if (segs[0] === 'teams' && segs[1] === 'invite' && segs[2] && segs[3] === 'join') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const inviteCode = segs[2];
      const { teams } = await getCollections();
      const team = await teams.findOne({ inviteCode });
      if (!team) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
      if (team.members.some(m => m.userId === user.id)) {
        return NextResponse.json({ error: 'Already in team' }, { status: 400 });
      }
      if (team.members.length >= team.maxSize) {
        return NextResponse.json({ error: 'Team is full' }, { status: 400 });
      }
      await teams.updateOne(
        { inviteCode },
        {
          $push: { members: { userId: user.id, role: 'member', joinedAt: new Date().toISOString() } },
          $set: { updatedAt: new Date().toISOString() }
        }
      );
      return NextResponse.json({ ok: true, teamId: team.id });
    }

    // POST /api/teams/[teamId]/send-invite — send invite email
    if (segs[0] === 'teams' && segs[2] === 'send-invite') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const teamId = segs[1];
      const body = await req.json();
      const { email } = body;
      if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      const { teams } = await getCollections();
      const team = await teams.findOne({ id: teamId });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      if (team.createdBy !== user.id) {
        return NextResponse.json({ error: 'Only team leader can send invites' }, { status: 403 });
      }
      const inviterName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.emailAddresses?.[0]?.emailAddress || 'Someone';
      const origin = new URL(req.url).origin;
      const inviteLink = `${origin}/invite/${team.inviteCode}`;
      await sendTeamInvite(email, team.name, inviterName, inviteLink);
      return NextResponse.json({ ok: true });
    }

    if (segs[0] === 'teams' && segs[2] === 'join') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const teamId = segs[1];
      const { teams } = await getCollections();
      const team = await teams.findOne({ id: teamId });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      if (team.members.some(m => m.userId === user.id)) {
        return NextResponse.json({ error: 'Already in team' }, { status: 400 });
      }
      if (team.members.length >= team.maxSize) {
        return NextResponse.json({ error: 'Team is full' }, { status: 400 });
      }
      await teams.updateOne(
        { id: teamId },
        {
          $push: { members: { userId: user.id, role: 'member', joinedAt: new Date().toISOString() } },
          $set: { updatedAt: new Date().toISOString() }
        }
      );
      return NextResponse.json({ ok: true });
    }

    if (segs[0] === 'teams' && segs[2] === 'leave') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const teamId = segs[1];
      const { teams } = await getCollections();
      const team = await teams.findOne({ id: teamId });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      const memberIndex = team.members.findIndex(m => m.userId === user.id);
      if (memberIndex === -1) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 400 });
      }
      const member = team.members[memberIndex];
      if (member.role === 'leader') {
        if (team.members.length === 1) {
          await teams.deleteOne({ id: teamId });
        } else {
          const updatedMembers = team.members.filter(m => m.userId !== user.id);
          updatedMembers[0].role = 'leader';
          await teams.updateOne(
            { id: teamId },
            { $set: { members: updatedMembers, updatedAt: new Date().toISOString() } }
          );
        }
      } else {
        await teams.updateOne(
          { id: teamId },
          {
            $pull: { members: { userId: user.id } },
            $set: { updatedAt: new Date().toISOString() }
          }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (segs[0] === 'teams') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      const { hackathonId, name, description, maxSize, skillsNeeded } = body;
      if (!hackathonId || !name || !description) {
        return NextResponse.json({ error: 'hackathonId, name, and description are required' }, { status: 400 });
      }
      const { teams } = await getCollections();
      const inviteCode = generateInviteCode();
      const newTeam = {
        id: uuid(),
        hackathonId,
        name,
        description,
        inviteCode,
        createdBy: user.id,
        members: [
          { userId: user.id, role: 'leader', joinedAt: new Date().toISOString() }
        ],
        maxSize: Number(maxSize) || 4,
        skillsNeeded: skillsNeeded || [],
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await teams.insertOne(newTeam);
      return NextResponse.json({ ok: true, team: newTeam });
    }

    if (segs[0] === 'alerts') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      const { type, filters, enabled } = body;
      const { alerts } = await getCollections();
      await alerts.updateOne(
        { userId: user.id },
        {
          $set: {
            type: type || 'weekly',
            filters: filters || { themes: [], minPrize: 0, mode: '', beginnerFriendly: false },
            enabled: !!enabled,
            updatedAt: new Date().toISOString(),
          }
        },
        { upsert: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (segs[0] === 'email' && segs[1] === 'digest') {
      const { alerts, hackathons } = await getCollections();
      const activeAlerts = await alerts.find({ enabled: true, type: 'weekly' }).toArray();
      const allHackathons = await hackathons.find({
        registrationDeadline: { $gte: new Date().toISOString() }
      }).toArray();
      
      const stats = {
        activeCount: allHackathons.length,
        totalPrize: allHackathons.reduce((s, h) => s + (h.prizePool || 0), 0),
        closingThisWeekCount: allHackathons.filter(h => {
          const ms = new Date(h.registrationDeadline) - new Date();
          return ms > 0 && ms <= 7 * 24 * 60 * 60 * 1000;
        }).length
      };

      for (const alert of activeAlerts) {
        const matching = allHackathons.filter(h => {
          const filters = alert.filters || {};
          if (filters.themes && filters.themes.length > 0) {
            const hasTheme = h.themes && h.themes.some(t => filters.themes.includes(t));
            if (!hasTheme) return false;
          }
          if (filters.minPrize > 0 && (h.prizePool || 0) < filters.minPrize) {
            return false;
          }
          if (filters.mode && h.mode !== filters.mode) {
            return false;
          }
          if (filters.beginnerFriendly && !h.beginnerFriendly) {
            return false;
          }
          return true;
        });

        await sendWeeklyDigest(alert.email, matching, stats);
      }
      return NextResponse.json({ ok: true, sentTo: activeAlerts.length });
    }

    return NextResponse.json({ error: 'route not found' }, { status: 404 });
  } catch (e) {
    console.error('POST error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ---------- DELETE ----------
export async function DELETE(req, { params }) {
  const segs = (await params).path || [];
  const url = new URL(req.url);
  try {
    if (segs[0] === 'saved') {
      const sid = url.searchParams.get('sid') || url.searchParams.get('userId');
      const hackathonId = url.searchParams.get('hackathonId');
      if (!sid || !hackathonId) return NextResponse.json({ error: 'sid or userId + hackathonId required' }, { status: 400 });
      const { saved, hackathons } = await getCollections();
      const r = await saved.deleteOne({ sid, hackathonId });
      if (r.deletedCount > 0) {
        await hackathons.updateOne({ id: hackathonId }, { $inc: { saves: -1 } });
      }
      return NextResponse.json({ ok: true });
    }
    if (segs[0] === 'teams') {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const teamId = segs[1];
      const { teams } = await getCollections();
      const team = await teams.findOne({ id: teamId });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      if (team.createdBy !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      await teams.deleteOne({ id: teamId });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'route not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
