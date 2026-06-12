"use client";

import { useState, useEffect } from "react";
import { Staff } from "@/lib/types/hierarchy";
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

export default function StaffPage() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff");
      const data = await res.json();
      setStaffList(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingId ? `/api/staff/${editingId}` : "/api/staff";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save staff");

      await fetchStaff();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving staff:", error);
    }
  };

  const openDeleteDialog = (staffId: string) => {
    setDeleteId(staffId);
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
      const res = await fetch(`/api/staff/${deleteId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete staff");
      }

      await fetchStaff();
      setDeleteId(null);
      setDeletePassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete staff";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error("Error deleting staff:", error);
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
      phone: "",
      address: "",
    });
    setEditingId(null);
  };

  const handleEdit = (staff: Staff) => {
    setFormData({
      username: staff.username,
      email: staff.email,
      password: staff.password,
      first_name: staff.first_name,
      last_name: staff.last_name,
      phone: staff.phone || "",
      address: staff.address || "",
    });
    setEditingId(staff.id);
    setOpenDialog(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const filteredStaffList = staffList.filter((staff) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${staff.first_name} ${staff.last_name}`.toLowerCase();
    return (
      fullName.includes(query) ||
      staff.username.toLowerCase().includes(query) ||
      staff.email.toLowerCase().includes(query) ||
      (staff.phone && staff.phone.toLowerCase().includes(query)) ||
      (staff.address && staff.address.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setOpenDialog(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Staff Member" : "Add New Staff Member"}
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
                  minLength={6}
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Search by name, email, phone, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
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
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchQuery ? "No staff members found matching your search" : "No staff members found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaffList.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>{staff.id}</TableCell>
                    <TableCell>{staff.username}</TableCell>
                    <TableCell>{staff.password}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>{staff.first_name}</TableCell>
                    <TableCell>{staff.last_name}</TableCell>
                    <TableCell>{staff.phone || "-"}</TableCell>
                    <TableCell>{staff.address || "-"}</TableCell>
                    <TableCell>
                      {new Date(staff.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(staff)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(staff.id)}
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
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this staff member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-staff-password">Password</Label>
            <Input
              id="delete-staff-password"
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
