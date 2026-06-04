"use client";

import { useState, useEffect } from "react";
import { Agent, Staff } from "@/lib/types/hierarchy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AgentsPage() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStaffId, setFilterStaffId] = useState<string>("all");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    staff_id: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentRes, staffRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/staff"),
      ]);
      const agentData = await agentRes.json();
      const staffData = await staffRes.json();
      setAgents(agentData);
      setStaffList(staffData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingId ? `/api/agents/${editingId}` : "/api/agents";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save agent");

      await fetchData();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving agent:", error);
    }
  };

  const openDeleteDialog = (agentId: string) => {
    setDeleteId(agentId);
    setDeletePassword("");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!deletePassword.trim()) {
      toast({
        title: "Password required",
        description: "Enter the delete password to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/agents/${deleteId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete agent");
      }

      await fetchData();
      setDeleteId(null);
      setDeletePassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete agent";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error("Error deleting agent:", error);
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      staff_id: "",
      phone: "",
      address: "",
    });
    setEditingId(null);
  };

  const handleEdit = (agent: Agent) => {
    setFormData({
      username: agent.username,
      email: agent.email,
      password: agent.password,
      first_name: agent.first_name,
      last_name: agent.last_name,
      staff_id: agent.staff_id,
      phone: agent.phone || "",
      address: agent.address || "",
    });
    setEditingId(agent.id);
    setOpenDialog(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStaffChange = (value: string) => {
    setFormData((prev) => ({ ...prev, staff_id: value }));
  };

  const getStaffName = (staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    return staff ? staff.username : "-";
  };

  const filteredAgents = agents.filter((agent) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${agent.first_name} ${agent.last_name}`.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      agent.username.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query) ||
      (agent.phone && agent.phone.toLowerCase().includes(query)) ||
      (agent.address && agent.address.toLowerCase().includes(query));
    const matchesStaff = filterStaffId === "all" || agent.staff_id === filterStaffId;
    return matchesSearch && matchesStaff;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agents Management</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setOpenDialog(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Agent" : "Add New Agent"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="username" className="min-w-24 text-end">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="password" className="min-w-24 text-end">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingId}
                  placeholder={editingId ? "Leave empty to keep current" : ""}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="email" className="min-w-24 text-end">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="staff_id" className="min-w-24 text-end">Assign to Staff</Label>
                <Select value={formData.staff_id} onValueChange={handleStaffChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="first_name" className="min-w-24 text-end">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="last_name" className="min-w-24 text-end">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="phone" className="min-w-24 text-end">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="address" className="min-w-24 text-end">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by name, email, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStaffId} onValueChange={setFilterStaffId}>
          <SelectTrigger className="w-62.5">
            <SelectValue placeholder="Filter by staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staffList.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.first_name} {staff.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Staff Member</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    {searchQuery || filterStaffId !== "all" ? "No agents found matching your criteria" : "No agents found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>{agent.id}</TableCell>
                    <TableCell>{agent.username}</TableCell>
                    <TableCell>{agent.password}</TableCell>
                    <TableCell>{agent.email}</TableCell>
                    <TableCell>{agent.first_name}</TableCell>
                    <TableCell>{agent.last_name}</TableCell>
                    <TableCell>{getStaffName(agent.staff_id)}</TableCell>
                    <TableCell>{agent.phone || "-"}</TableCell>
                    <TableCell>{agent.address || "-"}</TableCell>
                    <TableCell>
                      {new Date(agent.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(agent)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(agent.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
            setDeletePassword("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this agent? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-agent-password">Password</Label>
            <Input
              id="delete-agent-password"
              type="password"
              placeholder="Enter password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={deleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || !deletePassword.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
