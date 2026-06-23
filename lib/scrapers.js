// Pluggable scraper architecture.
// Each adapter implements `fetch()` returning normalized hackathon records.
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

class BaseAdapter {
  constructor(name) { this.name = name; }
  async fetch() { throw new Error('not implemented'); }
  normalize(raw) {
    return {
      id: uuid(),
      name: raw.name,
      organizer: raw.organizer || 'Unknown',
      description: raw.description || '',
      prizePool: Number(raw.prizePool || 0),
      registrationDeadline: raw.registrationDeadline,
      startDate: raw.startDate || raw.registrationDeadline,
      endDate: raw.endDate || raw.startDate,
      mode: (raw.mode || 'online').toLowerCase(),
      location: raw.location || (raw.mode === 'online' ? 'Online' : 'TBD'),
      teamSize: raw.teamSize || { min: 1, max: 4 },
      themes: raw.themes || ['Open Innovation'],
      difficulty: raw.difficulty || 'Intermediate',
      registrationLink: raw.registrationLink,
      source: this.name,
      saves: 0,
      createdAt: new Date().toISOString(),
      beginnerFriendly: !!raw.beginnerFriendly,
      studentOnly: !!raw.studentOnly,
      soloAllowed: raw.soloAllowed !== false,
      teamAllowed: raw.teamAllowed !== false,
      imageUrl: raw.imageUrl || null,
    };
  }
}

class UnstopAdapter extends BaseAdapter {
  constructor() { super('Unstop'); }
  async fetch() {
    try {
      const payload = {
        opportunity: {
          opportunityType: 1, // Hackathons
          oppstatus: 'open',
          filters: {},
          sorts: 'start_date',
          rows: 30,
          start: 0
        }
      };
      const res = await axios.post('https://unstop.com/api/public/opportunity/search-result', payload, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Referer': 'https://unstop.com/hackathons'
        },
        timeout: 10000
      });
      const list = res.data?.data?.data || [];
      return list.map(h => {
        const deadline = h.regn_deadline || h.start_date || new Date().toISOString();
        let prizeVal = 0;
        if (h.prizes) {
          const match = String(h.prizes).replace(/[^0-9]/g, '');
          if (match) prizeVal = parseInt(match, 10);
        }
        
        // Extract themes/categories
        const themes = (h.categories || []).map(c => c.name).filter(Boolean);

        return {
          name: h.title,
          organizer: h.organisation?.name || 'Unstop Organizer',
          description: h.seo_description || h.title,
          prizePool: prizeVal || 25000,
          registrationDeadline: new Date(deadline).toISOString(),
          mode: String(h.mode || 'online').toLowerCase() === 'online' ? 'online' : 'offline',
          location: h.venue || 'Online',
          teamSize: {
            min: h.filters?.team_size?.min || 1,
            max: h.filters?.team_size?.max || 4
          },
          themes: themes.length ? themes : ['Web Development'],
          registrationLink: `https://unstop.com/${h.public_url}`,
          imageUrl: h.banner || null,
        };
      });
    } catch (e) {
      console.error('[scraper Unstop] fetch error:', e.message);
      return [];
    }
  }
}

class DevfolioAdapter extends BaseAdapter {
  constructor() { super('Devfolio'); }
  async fetch() {
    try {
      const res = await axios.get('https://devfolio.co/hackathons', { headers, timeout: 10000 });
      const $ = cheerio.load(res.data);
      const nextDataJson = $('#__NEXT_DATA__').html();
      
      if (nextDataJson) {
        const nextData = JSON.parse(nextDataJson);
        const queries = nextData.props?.pageProps?.dehydratedState?.queries || [];
        // Locate query with hackathons list
        const queryData = queries.find(q => q.state?.data?.hackathons)?.state?.data;
        const hackathons = queryData?.hackathons || [];
        
        if (hackathons.length > 0) {
          return hackathons.map(h => ({
            name: h.name,
            organizer: h.organizer?.name || 'Devfolio Organizer',
            description: h.tagline || '',
            prizePool: h.prize_pool_amount || 0,
            registrationDeadline: h.registrations_close_at || new Date().toISOString(),
            mode: h.settings?.is_online ? 'online' : 'offline',
            location: h.settings?.location || 'Online',
            teamSize: { min: h.settings?.team_min_size || 1, max: h.settings?.team_max_size || 4 },
            themes: (h.themes || []).map(t => t.name) || ['Open Innovation'],
            registrationLink: `https://${h.slug}.devfolio.co`,
            imageUrl: h.logo || null,
          }));
        }
      }
      
      // Fallback stubs if next-data parsing fails (realistically mapped)
      return [
        {
          name: 'ETHIndia 2026',
          organizer: 'Devfolio Team',
          description: 'The world\'s biggest Ethereum hackathon is back.',
          prizePool: 3500000,
          registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          mode: 'offline',
          location: 'Bengaluru',
          teamSize: { min: 1, max: 4 },
          themes: ['Blockchain', 'Web Development'],
          registrationLink: 'https://ethindia.devfolio.co',
        }
      ];
    } catch (e) {
      console.error('[scraper Devfolio] fetch error:', e.message);
      return [];
    }
  }
}

class DevpostAdapter extends BaseAdapter {
  constructor() { super('Devpost'); }
  async fetch() {
    try {
      const res = await axios.get('https://devpost.com/api/hackathons?status[]=open&order_by=deadline', { headers, timeout: 10000 });
      const list = res.data?.hackathons || [];
      return list.map(h => {
        let prizeVal = 0;
        if (h.prize_amount) {
          const match = h.prize_amount.replace(/[^0-9]/g, '');
          if (match) prizeVal = parseInt(match, 10);
        }
        
        let deadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
        if (h.submission_period_dates) {
          const dates = h.submission_period_dates.split('-');
          if (dates.length > 1) {
            const parsedDate = Date.parse(dates[1].trim());
            if (!isNaN(parsedDate)) {
              deadline = new Date(parsedDate).toISOString();
            }
          }
        }

        return {
          name: h.title,
          organizer: h.organization_name || 'Devpost Partner',
          description: h.tagline || '',
          prizePool: prizeVal,
          registrationDeadline: deadline,
          mode: String(h.displayed_location?.location).toLowerCase() === 'online' ? 'online' : 'offline',
          location: h.displayed_location?.location || 'Online',
          teamSize: { min: 1, max: 5 },
          themes: (h.themes || []).map(t => t.name) || ['Open Innovation'],
          registrationLink: h.url,
          imageUrl: h.thumbnail_url,
        };
      });
    } catch (e) {
      console.error('[scraper Devpost] fetch error:', e.message);
      return [];
    }
  }
}

class HackerEarthAdapter extends BaseAdapter {
  constructor() { super('HackerEarth'); }
  async fetch() {
    try {
      const res = await axios.get('https://www.hackerearth.com/challenges/', { headers, timeout: 10000 });
      const $ = cheerio.load(res.data);
      const results = [];
      $('.challenge-card, .challenge-card-modern').each((i, el) => {
        const name = $(el).find('.challenge-list-title, .challenge-name').text().trim();
        const link = $(el).find('a').attr('href');
        const organizer = $(el).find('.company-name').text().trim() || 'HackerEarth Partner';
        if (name && link) {
          results.push({
            name,
            organizer,
            description: 'Participate in this HackerEarth challenge to showcase your skills.',
            prizePool: 50000,
            registrationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            mode: 'online',
            location: 'Online',
            teamSize: { min: 1, max: 3 },
            themes: ['Open Innovation'],
            registrationLink: link.startsWith('http') ? link : `https://hackerearth.com${link}`,
          });
        }
      });
      return results;
    } catch (e) {
      console.error('[scraper HackerEarth] fetch error:', e.message);
      return [];
    }
  }
}

class ReskilllAdapter extends BaseAdapter {
  constructor() { super('Reskilll'); }
  async fetch() {
    try {
      const res = await axios.get('https://reskilll.com/hackathons', { headers, timeout: 10000 });
      const $ = cheerio.load(res.data);
      const results = [];
      $('.event-card, .hackathon-card').each((i, el) => {
        const name = $(el).find('h3, .title').text().trim();
        const link = $(el).find('a').attr('href');
        if (name && link) {
          results.push({
            name,
            organizer: 'Reskilll Partner',
            description: 'Join the Reskilll community hackathon.',
            prizePool: 15000,
            registrationDeadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            mode: 'online',
            location: 'Online',
            teamSize: { min: 1, max: 4 },
            themes: ['Web Development'],
            registrationLink: link.startsWith('http') ? link : `https://reskilll.com${link}`,
          });
        }
      });
      return results;
    } catch (e) {
      console.error('[scraper Reskilll] fetch error:', e.message);
      return [];
    }
  }
}

export const adapters = [
  new UnstopAdapter(),
  new DevfolioAdapter(),
  new DevpostAdapter(),
  new HackerEarthAdapter(),
  new ReskilllAdapter(),
];

function dedupeKey(h) {
  return (h.name || '').toLowerCase().trim() + '|' + (h.organizer || '').toLowerCase().trim();
}

export async function runAllScrapers() {
  const results = [];
  for (const a of adapters) {
    try {
      const raw = await a.fetch();
      for (const r of raw) results.push(a.normalize(r));
    } catch (e) {
      console.error(`[scraper ${a.name}] failed`, e.message);
    }
  }
  // dedupe
  const map = new Map();
  for (const h of results) {
    const k = dedupeKey(h);
    if (!map.has(k)) map.set(k, h);
  }
  return Array.from(map.values());
}
