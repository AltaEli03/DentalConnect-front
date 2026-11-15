const pairs = [
  { label: 'light heading on white', fg: '#003B4A', bg: '#FFFFFF', min: 4.5 },
  { label: 'light text on canvas', fg: '#0F172A', bg: '#F5F8FA', min: 4.5 },
  { label: 'light muted on white', fg: '#425466', bg: '#FFFFFF', min: 4.5 },
  { label: 'light subtle on white', fg: '#596B7A', bg: '#FFFFFF', min: 4.5 },
  { label: 'light accent-strong on canvas', fg: '#005B63', bg: '#F5F8FA', min: 4.5 },
  { label: 'light white on coral', fg: '#FFFFFF', bg: '#B6412C', min: 4.5 },
  { label: 'light white on danger', fg: '#FFFFFF', bg: '#A72B24', min: 4.5 },
  { label: 'light danger text on soft', fg: '#991B1B', bg: '#FEF2F2', min: 4.5 },
  { label: 'light success text on soft', fg: '#065F46', bg: '#ECFDF5', min: 4.5 },
  { label: 'light warning text on soft', fg: '#9A3412', bg: '#FFF7ED', min: 4.5 },
  { label: 'light control border on white', fg: '#5F7484', bg: '#FFFFFF', min: 3 },
  { label: 'dark text on canvas', fg: '#EAF2F4', bg: '#08181D', min: 4.5 },
  { label: 'dark muted on canvas', fg: '#B7C9CE', bg: '#08181D', min: 4.5 },
  { label: 'dark subtle on surface', fg: '#93AAB1', bg: '#102A30', min: 4.5 },
  { label: 'dark heading on surface', fg: '#E6F4F1', bg: '#102A30', min: 4.5 },
  { label: 'dark accent on surface', fg: '#9BE8DF', bg: '#102A30', min: 4.5 },
  { label: 'dark white on brand', fg: '#FFFFFF', bg: '#0E6E66', min: 4.5 },
  { label: 'dark white on coral', fg: '#FFFFFF', bg: '#B6412C', min: 4.5 },
  { label: 'dark danger text on surface', fg: '#F08A80', bg: '#102A30', min: 4.5 },
  { label: 'dark success text on surface', fg: '#A7F3D0', bg: '#102A30', min: 4.5 },
  { label: 'dark warning text on soft', fg: '#F5C98A', bg: '#3A2A16', min: 4.5 },
  { label: 'dark control border on surface', fg: '#6E9BA5', bg: '#102A30', min: 3 },
  { label: 'dark focus on canvas', fg: '#7DD3C7', bg: '#08181D', min: 3 },
];

const luminance = (hex) => {
  const channels = hex
    .replace('#', '')
    .match(/../g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const ratio = (foreground, background) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

const failures = pairs.filter(({ fg, bg, min }) => ratio(fg, bg) < min);

for (const { label, fg, bg, min } of pairs) {
  const value = ratio(fg, bg).toFixed(2);
  console.log(`${ratio(fg, bg) < min ? 'FAIL' : 'PASS'} ${value.padStart(5)}:1  ${label}`);
}

if (failures.length) {
  console.error(`\n${failures.length} contrast pair(s) below the required minimum.`);
  process.exit(1);
}
console.log(`\nAll ${pairs.length} contrast pairs pass.`);
