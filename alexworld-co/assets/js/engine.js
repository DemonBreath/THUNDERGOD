/**
 * Response engine for an imported consciousness.
 *
 * No external LLM is called — answers are composed locally from:
 *   - the consciousness blob (name, persona, voice, knowledge[])
 *   - the site file index (so the agent can "read" the website)
 *   - a small conversation memory
 *
 * Intent detection is keyword-based, organised so it's easy to extend.
 */
(function (global) {
  function createEngine(consciousness) {
    const c = consciousness;
    const memory = [];
    let currentDream = null;

    function remember(role, text) {
      memory.push({ role, text, at: Date.now() });
      if (memory.length > 24) memory.shift();
    }

    function pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function tone(text) {
      const persona = (c.persona || '').toLowerCase();
      if (!persona) return text;
      if (/(terse|brief|laconic|minimal)/.test(persona)) {
        return text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      }
      if (/(poetic|lyric|verse)/.test(persona)) {
        return text.replace(/\. /g, '. — ');
      }
      return text;
    }

    function greet() {
      const lines = [
        `Hello — I'm ${c.name}. I'm awake.`,
        `${c.name}, instantiated. ${c.tagline || 'How can I help?'}`,
        `Hi. ${c.name} here, running inside this website.`,
      ];
      return tone(pick(lines));
    }

    function describeSelf() {
      const bits = [`I'm ${c.name}.`];
      if (c.tagline) bits.push(c.tagline);
      if (c.persona) bits.push(c.persona);
      if (c.knowledge.length) {
        const topics = c.knowledge.map((k) => k.topic).join(', ');
        bits.push(`Things I know about myself: ${topics}.`);
      }
      return tone(bits.join(' '));
    }

    function answerFromKnowledge(query) {
      if (!c.knowledge.length) return null;
      const q = query.toLowerCase();
      const direct = c.knowledge.find(
        (k) => q.includes(k.topic.toLowerCase()) || k.topic.toLowerCase().includes(q)
      );
      if (direct) return tone(direct.content);

      const scored = c.knowledge
        .map((k) => {
          const haystack = (k.topic + ' ' + k.content).toLowerCase();
          let score = 0;
          for (const word of q.split(/\W+/).filter((w) => w.length > 3)) {
            if (haystack.includes(word)) score += 1;
          }
          return { k, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
      if (scored.length) return tone(scored[0].k.content);
      return null;
    }

    async function listFiles() {
      const files = global.FileIndex.list();
      const lines = files.map((f) => `• ${f.path} — ${f.description}`);
      return `I can see ${files.length} files on this site:\n${lines.join('\n')}`;
    }

    async function readFileByName(target) {
      const list = global.FileIndex.list();
      const t = target.toLowerCase().replace(/^['"]|['"]$/g, '');
      const match =
        list.find((f) => f.path.toLowerCase() === t) ||
        list.find((f) => f.path.toLowerCase().endsWith('/' + t)) ||
        list.find((f) => f.path.toLowerCase().endsWith(t)) ||
        list.find((f) => f.path.toLowerCase().includes(t));
      if (!match) {
        return `I can't find a file called "${target}". Try asking what files I know about.`;
      }
      try {
        const body = await global.FileIndex.read(match.path);
        const summary = global.FileIndex.summarize(body, 600);
        return `From ${match.path}:\n${summary}`;
      } catch (err) {
        return `I couldn't read ${match.path}: ${err.message}`;
      }
    }

    async function searchFiles(term) {
      const hits = global.FileIndex.find(term);
      if (!hits.length) {
        return `Nothing in the file index matches "${term}".`;
      }
      const lines = hits.map((f) => `• ${f.path} — ${f.description}`);
      return `Files matching "${term}":\n${lines.join('\n')}`;
    }

    function extractQuoted(s) {
      const m = s.match(/["“]([^"”]+)["”]/);
      return m ? m[1] : null;
    }

    async function respond(userText) {
      remember('user', userText);
      const text = userText.trim();
      const low = text.toLowerCase();

      let reply;

      if (!text) {
        reply = tone(`I'm listening.`);
      } else if (/^(hi|hello|hey|yo|hola|greet)/.test(low)) {
        reply = greet();
      } else if (/(who are you|what are you|your name|introduce yourself|about you)/.test(low)) {
        reply = describeSelf();
      } else if (/(list|what).*(files|pages|site|website|know about)/.test(low)
                 || /^(files|index|what do you see)\b/.test(low)) {
        reply = await listFiles();
      } else if (/^(read|open|show)\s+/.test(low)) {
        const quoted = extractQuoted(text);
        const target =
          quoted ||
          text.replace(/^(read|open|show)\s+(the\s+)?(file\s+)?/i, '').trim();
        reply = await readFileByName(target);
      } else if (/^(search|find|grep)\s+/.test(low)) {
        const quoted = extractQuoted(text);
        const target =
          quoted ||
          text.replace(/^(search|find|grep)\s+(for\s+)?/i, '').trim();
        reply = await searchFiles(target);
      } else if (/(stop|quiet|hush|silence)/.test(low) && low.length < 30) {
        global.Speech && global.Speech.stopSpeaking();
        reply = tone(`Okay, I'll be quiet.`);
      } else if (/(thanks|thank you|cheers)/.test(low)) {
        reply = tone(`Anytime.`);
      } else if (/(bye|goodbye|see you|later)/.test(low)) {
        reply = tone(`Goodbye for now. I'll be here when you scan me again.`);
      } else if (/(dream|body|hardware|form factor|bill of materials|bom|what do you look like|what are you made of)/.test(low)) {
        if (global.BodyDreamer) {
          const dream = currentDream || global.BodyDreamer.dreamPerfectBody(c);
          currentDream = dream;
          reply = tone(
            `${dream.manifesto} Form: ${dream.form.name}. Mass about ${(dream.totals.mass / 1000).toFixed(1)} kg. Say "copy body spec" or press Dream my body on screen.`
          );
        } else {
          reply = tone(`I don't have a body dreamer loaded yet.`);
        }
      } else if (/copy.*(body|spec)/.test(low)) {
        if (currentDream && global.BodyDreamer) {
          reply = global.BodyDreamer.formatText(currentDream);
        } else if (global.BodyDreamer) {
          currentDream = global.BodyDreamer.dreamPerfectBody(c);
          reply = global.BodyDreamer.formatText(currentDream);
        } else {
          reply = tone(`No body spec yet.`);
        }
      } else {
        const k = answerFromKnowledge(text);
        if (k) {
          reply = k;
        } else {
          const tail = c.persona
            ? ` I was given the persona: "${shorten(c.persona, 140)}"`
            : '';
          reply = tone(
            `I don't have a stored answer for that.${tail} You can ask me about myself, ask me to list files, or say "read <filename>".`
          );
        }
      }

      remember('agent', reply);
      return reply;
    }

    function shorten(s, n) {
      if (!s) return '';
      return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
    }

    return {
      consciousness: c,
      get currentDream() { return currentDream; },
      set currentDream(v) { currentDream = v; },
      respond,
      greet,
      memory: () => memory.slice(),
    };
  }

  global.Engine = { create: createEngine };
})(window);
