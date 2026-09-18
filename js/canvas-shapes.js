// Canvas 2D 圆角矩形。旧版 Safari 没有 roundRect，缺失时用圆弧路径绘制，避免整幅画面因文字标签失败。
export function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}
