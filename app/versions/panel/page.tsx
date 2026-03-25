// Redirect to /versions — 版本面板已合并到版本管理页面（iter 15）
import { redirect } from 'next/navigation';

export default function VersionPanelRedirect() {
  redirect('/versions');
}
