import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdminAccountMenu } from '@/components/admin/account-menu';
afterEach(cleanup);
const actor={status:true,userId:7,role:'ADMIN' as const,name:'Zen Goku',email:'fixture@example.invalid'};
it('shows the real name and keeps actions inside the dropdown',()=>{
 const onSwitch=vi.fn(),onLogout=vi.fn();
 render(<AdminAccountMenu actor={actor} busy={false} preview={false} onSwitch={onSwitch} onLogout={onLogout}/>);
 expect(screen.getByRole('button',{name:'Account: Zen Goku'})).toHaveAttribute('aria-expanded','false');
 expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Account: Zen Goku'}));
 fireEvent.click(screen.getByRole('menuitem',{name:'Switch to user'}));
 expect(onSwitch).toHaveBeenCalledOnce();expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});
it('supports arrow navigation, Escape, outside click and logout',()=>{
 const onLogout=vi.fn();render(<AdminAccountMenu actor={actor} busy={false} preview={false} onSwitch={()=>{}} onLogout={onLogout}/>);
 const button=screen.getByRole('button',{name:'Account: Zen Goku'});
 fireEvent.click(button);expect(screen.getByRole('menuitem',{name:'Switch to user'})).toHaveFocus();
 fireEvent.keyDown(document.activeElement!,{key:'ArrowDown'});expect(screen.getByRole('menuitem',{name:'Sign out'})).toHaveFocus();
 fireEvent.keyDown(document.activeElement!,{key:'Escape'});expect(button).toHaveFocus();expect(screen.queryByRole('menu')).not.toBeInTheDocument();
 fireEvent.click(button);fireEvent.pointerDown(document.body);expect(screen.queryByRole('menu')).not.toBeInTheDocument();
 fireEvent.click(button);fireEvent.click(screen.getByRole('menuitem',{name:'Sign out'}));expect(onLogout).toHaveBeenCalledOnce();
});
it('falls back to the email without inventing a name',()=>{
 render(<AdminAccountMenu actor={{...actor,name:''}} busy={false} preview={false} onSwitch={()=>{}} onLogout={()=>{}}/>);
 expect(screen.getByRole('button',{name:'Account: fixture@example.invalid'})).toBeInTheDocument();
});
