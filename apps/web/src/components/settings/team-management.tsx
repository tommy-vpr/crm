"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  Badge,
  Dialog,
  DialogHeader,
  DialogTitle,
  Select,
} from "@/components/ui/index";
import { Avatar } from "@/components/ui/index";
import { toast } from "sonner";
import { useConfirm } from "../ui/confirm-dialog";

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  };
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  _count: { deals: number; contacts: number; pipelines: number };
}

interface AppUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
}

export function TeamManagement() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) setTeams(await res.json());
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch {}
  };

  useEffect(() => {
    Promise.all([fetchTeams(), fetchUsers()]).then(() => setLoading(false));
  }, []);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Team created");
      setNewTeamName("");
      setShowCreate(false);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.message || "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Teams</h2>
        {teams.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-slate-500">
              No teams assigned. Ask an admin to add you to a team.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <Card key={team.id} className="p-4">
                <h3 className="font-medium text-slate-900">{team.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {team.members.length} member
                  {team.members.length !== 1 ? "s" : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (loading) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Teams</h2>
        <Button onClick={() => setShowCreate(true)}>+ New Team</Button>
      </div>

      {teams.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500">No teams yet.</p>
          <Button className="mt-3" onClick={() => setShowCreate(true)}>
            Create Your First Team
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              users={users}
              onUpdated={fetchTeams}
            />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>New Team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Team Name</label>
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Sales Team"
              onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTeam}
              disabled={!newTeamName.trim()}
              loading={creating}
            >
              Create Team
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

// ─── Team Card ──────────────────────────────────────────────────

function TeamCard({
  team,
  users,
  onUpdated,
}: {
  team: Team;
  users: AppUser[];
  onUpdated: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [adding, setAdding] = useState(false);

  const memberUserIds = new Set(team.members.map((m) => m.userId));
  const availableUsers = users.filter((u) => !memberUserIds.has(u.id));

  const confirm = useConfirm();

  const handleDeleteTeam = async () => {
    const ok = await confirm({
      title: "Delete Team",
      message: (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">
            This team has {team._count.deals} deals and {team._count.pipelines}{" "}
            pipelines. This cannot be undone.
          </p>
        </div>
      ),
      typeToConfirm: team.name,
      confirmLabel: "Delete Team",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete team");
      }
      toast.success("Team deleted");
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete team");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Member added");
      setSelectedUserId("");
      setShowAdd(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    const ok = await confirm({
      title: "Remove Member",
      message: `Remove ${userName} from ${team.name}?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `/api/teams/${team.id}/members?userId=${userId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Member removed");
      onUpdated();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{team.name}</h3>
          <span className="text-xs text-slate-500">
            {team.members.length} member{team.members.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-slate-400">
            {team._count.deals} deals · {team._count.contacts} contacts ·{" "}
            {team._count.pipelines} pipelines
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            + Add Member
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteTeam}
            loading={deleting}
            className="text-destructive hover:bg-destructive/10"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {team.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-slate-50"
          >
            <Avatar
              name={member.user.name ?? "?"}
              src={member.user.image}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {member.user.name || member.user.email}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {member.user.email}
              </p>
            </div>
            <Badge variant={member.role === "LEAD" ? "warning" : "secondary"}>
              {member.role}
            </Badge>
            <Badge variant="outline">{member.user.role}</Badge>
            <button
              onClick={() =>
                handleRemoveMember(
                  member.userId,
                  member.user.name || member.user.email,
                )
              }
              className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-red-50 hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ))}

        {team.members.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">
            No members yet. Add someone to get started.
          </p>
        )}
      </div>

      {showAdd && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed p-3">
          <Select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1"
          >
            <option value="">Select user...</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email} ({u.role})
              </option>
            ))}
          </Select>
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-32"
          >
            <option value="MEMBER">Member</option>
            <option value="LEAD">Lead</option>
          </Select>
          <Button
            size="sm"
            onClick={handleAddMember}
            loading={adding}
            disabled={!selectedUserId}
          >
            Add
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}
