import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GoogleRoleModal } from '@/components/auth/google-role-modal';
import { authApi, contentApi } from '@/api';
vi.mock('@/api',()=>({
 authApi:{registerManual:vi.fn(),authenticateGoogle:vi.fn()},
 contentApi:{getUniversities:vi.fn(),getOrganizations:vi.fn()},
}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it.each(['manual','google'])('offers only User/Organizer and submits self-service organizer signup via %s', async(mode)=>{
 vi.mocked(contentApi.getUniversities).mockResolvedValue({status:true,message:'OK',data:[]});
 vi.mocked(contentApi.getOrganizations).mockResolvedValue({status:true,message:'OK',data:[{id:1,name:'Society',type:'Club',org_type_id:1}]});
 const result={status:true,action:'REGISTERED',roleId:'ORGANIZER',userId:7};
 vi.mocked(authApi.registerManual).mockResolvedValue(result);vi.mocked(authApi.authenticateGoogle).mockResolvedValue(result);
 const success=vi.fn();
 render(<GoogleRoleModal isOpen onClose={vi.fn()} onSuccess={success} idToken="signed-fixture"
   manualRegistration={mode==='manual'?{fname:'Test',lname:'Organizer',email:'fixture@example.invalid',password:'fixture-pass',confirmPassword:'fixture-pass'}:undefined}/>);
 expect(screen.getByRole('button',{name:/^User/})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/^Student/})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/^Admin/})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/^Organizer/}));
 await screen.findByRole('option',{name:'Society (Club)'});
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'1'}});
 fireEvent.change(screen.getByPlaceholderText('e.g. President, Event Lead, Committee Member'),{target:{value:'Chair'}});
 fireEvent.click(screen.getByRole('button',{name:'Complete Registration'}));
 await waitFor(()=>expect(success).toHaveBeenCalledWith(result));
 expect(mode==='manual'?authApi.registerManual:authApi.authenticateGoogle)
  .toHaveBeenCalledWith(expect.objectContaining({roleId:'2',orgId:'1',position:'Chair'}));
});
