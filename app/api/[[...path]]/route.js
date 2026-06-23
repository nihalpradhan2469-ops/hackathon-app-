import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getCollections } from '@/lib/mongo';
import { SEED_HACKATHONS } from '@/lib/seedHackathons';
import { runAllScrapers } from '@/lib/scrapers';

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
      const sid = url.searchParams.get('sid');
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
      const { sid, hackathonId } = body;
      if (!sid || !hackathonId) return NextResponse.json({ error: 'sid + hackathonId required' }, { status: 400 });
      const { saved, hackathons } = await getCollections();
      const exists = await saved.findOne({ sid, hackathonId });
      if (!exists) {
        await saved.insertOne({ id: uuid(), sid, hackathonId, createdAt: new Date().toISOString() });
        await hackathons.updateOne({ id: hackathonId }, { $inc: { saves: 1 } });
      }
      return NextResponse.json({ ok: true });
    }

    if (segs[0] === 'scrape') {
      const items = await runAllScrapers();
      const { hackathons, scrapeRuns } = await getCollections();
      let inserted = 0;
      for (const item of items) {
        const ex = await hackathons.findOne({ name: item.name, organizer: item.organizer });
        if (!ex) { await hackathons.insertOne(item); inserted++; }
      }
      await scrapeRuns.insertOne({
        id: uuid(),
        ranAt: new Date().toISOString(),
        fetched: items.length,
        inserted,
      });
      return NextResponse.json({ ok: true, fetched: items.length, inserted });
    }

    if (segs[0] === 'seed' && segs[1] === 'reset') {
      const { hackathons } = await getCollections();
      await hackathons.deleteMany({});
      await hackathons.insertMany(SEED_HACKATHONS);
      return NextResponse.json({ ok: true, count: SEED_HACKATHONS.length });
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
      const sid = url.searchParams.get('sid');
      const hackathonId = url.searchParams.get('hackathonId');
      if (!sid || !hackathonId) return NextResponse.json({ error: 'sid + hackathonId required' }, { status: 400 });
      const { saved, hackathons } = await getCollections();
      const r = await saved.deleteOne({ sid, hackathonId });
      if (r.deletedCount > 0) {
        await hackathons.updateOne({ id: hackathonId }, { $inc: { saves: -1 } });
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'route not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
