import React, { useState } from 'react';
import { BACKEND_URL } from '../config';
import axios from 'axios';
import { toast } from 'sonner';

const SpaceMembers = ({spaceId, emails, onUpdate }) => {
    console.log(spaceId)
  const [isModalOpen, setModalOpen] = useState(false);
  const [members, setMembers] = useState(emails);
  const [newEmail, setNewEmail] = useState('');

  const handleAdd = () => {
    if (newEmail) {
      setMembers([...members, { username: newEmail, id: Date.now().toString() }]);
      setNewEmail('');
    }
  };

  const handleRemove = (id) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    try {
      const emails = members.map(m => m.username);
  
      await axios.put(`${BACKEND_URL}/space/${spaceId}/members`, {
        emails,
      }, {
        headers:{
            Authorization:`${localStorage.getItem("token")}`
        }
      });
  
      toast("Members Updated Successfully");

      onUpdate?.(members);
      setModalOpen(false);
    } catch (err) {
        console.error("Failed to update members:", err);
      
        if (err.response && err.response.status === 400) {
          toast("Some user not found in database, please check emails again.");
        }
      }
    }
      


  return (
    <>
      <div className="flex gap-2 flex-wrap">
      <button
  onClick={() => setModalOpen(true)}
  className="absolute top-4 right-4 bg-white text-gray-800 px-4 py-2 rounded-xl shadow-md hover:bg-slate-100 transition font-medium"
>
  Team Members
</button>

      </div>

      {isModalOpen && (
       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
       <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
         <h2 className="text-2xl font-semibold text-gray-800 mb-5 text-center">Team Members</h2>
     
         <div className="space-y-3 max-h-64 overflow-y-auto">
           {members.map(member => (
             <div key={member.id} className="flex items-center justify-between bg-slate-100 px-4 py-2 rounded-lg">
               <span className="text-gray-700 text-sm">{member.username}</span>
               <button
                 onClick={() => handleRemove(member.id)}
                 className="text-red-500 hover:text-red-700 font-medium text-sm"
               >
                 Remove
               </button>
             </div>
           ))}
         </div>
     
         <div className="mt-4 flex gap-2">
           <input
             value={newEmail}
             onChange={e => setNewEmail(e.target.value)}
             type="email"
             placeholder="Add user email"
             className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
           />
           <button
             onClick={handleAdd}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
           >
             Add
           </button>
         </div>
     
         <div className="mt-6 flex justify-end gap-2">
           <button
             onClick={() => setModalOpen(false)}
             className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700"
           >
             Cancel
           </button>
           <button
             onClick={handleSave}
             className="px-4 py-2 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
           >
             Save
           </button>
         </div>
       </div>
     </div>
     
      )}
    </>
  );
};

export default SpaceMembers;
