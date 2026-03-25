// Redirect to /versions — 分支管理已合并到版本管理页面（iter 15）
import { redirect } from 'next/navigation';

export default function BranchesRedirect() {
  redirect('/versions');
}
