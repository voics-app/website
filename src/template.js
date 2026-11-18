const root = document.getElementById('main');
const element = (id) => document.getElementById(`template-${id}`);
const code = new URL(location.href).searchParams.get('code');
const channelKinds = { 0: 'Text', 2: 'Voice', 5: 'Announcements', 13: 'Stage', 15: 'Forum' };

function textNode(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function showTemplate(template) {
  const { roles, channels } = template.serialized_source_guild;
  element('name').textContent = template.name;
  element('description').textContent = template.description || 'A shared starting point for your new server.';
  const visibleRoles = roles.filter((role) => role.id !== 0);
  element('roles').replaceChildren(...visibleRoles.map((role) => textNode('li', role.name)));
  element('roles-section').hidden = visibleRoles.length === 0;
  const byPosition = (a, b) => a.position - b.position || a.id - b.id;
  const groups = [{ id: null, name: 'Channels' }, ...channels.filter((channel) => channel.type === 4).sort(byPosition)];
  element('channels').replaceChildren();
  for (const group of groups) {
    const children = channels.filter((channel) => channel.type !== 4 && channel.parent_id === group.id).sort(byPosition);
    if (!children.length && group.id === null) continue;
    const section = document.createElement('section');
    section.append(textNode('h3', group.name));
    const list = document.createElement('ul');
    for (const channel of children) {
      const item = textNode('li', channel.name);
      const kind = textNode('span', channelKinds[channel.type] || 'Channel');
      kind.className = 'template-channel-kind';
      item.append(kind);
      list.append(item);
    }
    section.append(list);
    element('channels').append(section);
  }
  const count = channels.filter((channel) => channel.type !== 4).length;
  element('counts').textContent = `${count} ${count === 1 ? 'channel' : 'channels'} · ${visibleRoles.length} ${visibleRoles.length === 1 ? 'role' : 'roles'}`;
  element('open').href = `${root.dataset.appScheme}://template/${encodeURIComponent(code)}`;
  element('status').textContent = 'Template ready. Open the app to name and create your server.';
  element('preview').hidden = false;
}

async function load() {
  element('preview').hidden = true;
  element('retry').hidden = true;
  element('status').textContent = 'Loading template…';
  if (!code || !/^[A-Za-z0-9-]{2,64}$/.test(code)) {
    element('status').textContent = 'This template link is not valid. Ask the sender for a new link.';
    return;
  }
  try {
    const response = await fetch(`${root.dataset.apiUrl}/api/v1/guilds/templates/${encodeURIComponent(code)}`, {
      credentials: 'omit', signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) {
      element('name').textContent = 'Template unavailable';
      element('status').textContent = 'This template was deleted or the link is incorrect. Ask the sender for a new link.';
      return;
    }
    if (!response.ok) throw new Error('Template request failed');
    showTemplate(await response.json());
  } catch {
    element('status').textContent = 'Could not load this template. Check your connection and try again.';
    element('retry').hidden = false;
  }
}

element('retry').addEventListener('click', () => void load());
void load();
