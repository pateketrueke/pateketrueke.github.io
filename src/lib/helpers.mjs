import slugify from 'slugify';

export function slug(value) {
  return slugify(value, { lower: true });
}
