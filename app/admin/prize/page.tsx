"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/admin/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Edit2, Trash2, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrizeData {
  columns: string[];
  data: { [key: string]: number[] };
}

interface Prize {
  id: string;
  name: string;
  data: PrizeData;
  created_at?: string;
  updated_at?: string;
}

const defaultData = {
  name: "",
  columns: ["U1", "U2", "U3", "U4", "U5", "U6", "U7"],
  rows: [
    { label: "1~12", values: ["0", "0", "0", "0", "0", "0", "0"] },
    { label: "13~14", values: ["0", "0", "0", "0", "0", "0", "0"] },
    { label: "15~16", values: ["0", "0", "0", "0", "0", "0", "0"] },
    { label: "17~49", values: ["0", "0", "0", "0", "0", "0", "0"] },
  ],
}

export default function PrizePage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [prizeToDelete, setPrizeToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState(defaultData);

  useEffect(() => {
    fetchPrizes();
  }, []);

  const fetchPrizes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/prize");
      const data = await response.json();

      if (response.ok) {
        setPrizes(data.prizes || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch prizes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching prizes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch prizes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);

      // Convert form data to prize data structure
      const prizeData: PrizeData = {
        columns: formData.columns.filter((col) => col.trim() !== ""),
        data: {},
      };

      formData.rows.forEach((row) => {
        if (row.label.trim() !== "") {
          prizeData.data[row.label] = row.values
            .filter((val) => val.trim() !== "")
            .map((val) => parseFloat(val) || 0);
        }
      });

      const response = await fetch("/api/admin/prize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          data: prizeData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Prize created successfully",
        });
        fetchPrizes();
        setIsCreateOpen(false);
        resetForm();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create prize",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating prize:", error);
      toast({
        title: "Error",
        description: "Failed to create prize",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPrize) return;

    try {
      setSubmitting(true);

      // Convert form data to prize data structure
      const prizeData: PrizeData = {
        columns: formData.columns.filter((col) => col.trim() !== ""),
        data: {},
      };

      formData.rows.forEach((row) => {
        if (row.label.trim() !== "") {
          prizeData.data[row.label] = row.values
            .filter((val) => val.trim() !== "")
            .map((val) => parseFloat(val) || 0);
        }
      });

      const response = await fetch(`/api/admin/prize/${selectedPrize.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          data: prizeData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Prize updated successfully",
        });
        fetchPrizes();
        setIsEditDialogOpen(false);
        setSelectedPrize(null);
        resetForm();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update prize",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating prize:", error);
      toast({
        title: "Error",
        description: "Failed to update prize",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!prizeToDelete) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/prize/${prizeToDelete}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Prize deleted successfully",
        });
        fetchPrizes();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete prize",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting prize:", error);
      toast({
        title: "Error",
        description: "Failed to delete prize",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setIsDeleteAlertOpen(false);
      setPrizeToDelete(null);
    }
  };

  const openEditDialog = (prize: Prize) => {
    setSelectedPrize(prize);

    // Convert prize data to form format
    const rows = Object.entries(prize.data.data).map(([label, values]) => ({
      label,
      values: values.map(String),
    }));

    setFormData({
      name: prize.name,
      columns: [...prize.data.columns],
      rows: rows.length > 0 ? rows : [{ label: "", values: [""] }],
    });

    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(defaultData);
  };

  const addColumn = () => {
    setFormData({
      ...formData,
      columns: [...formData.columns, ""],
      rows: formData.rows.map((row) => ({
        ...row,
        values: [...row.values, ""],
      })),
    });
  };

  const removeColumn = (index: number) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter((_, i) => i !== index),
      rows: formData.rows.map((row) => ({
        ...row,
        values: row.values.filter((_, i) => i !== index),
      })),
    });
  };

  const updateColumn = (index: number, value: string) => {
    const newColumns = [...formData.columns];
    newColumns[index] = value;
    setFormData({ ...formData, columns: newColumns });
  };

  const addRow = () => {
    setFormData({
      ...formData,
      rows: [
        ...formData.rows,
        { label: "", values: new Array(formData.columns.length).fill("") },
      ],
    });
  };

  const removeRow = (index: number) => {
    setFormData({
      ...formData,
      rows: formData.rows.filter((_, i) => i !== index),
    });
  };

  const updateRowLabel = (index: number, value: string) => {
    const newRows = [...formData.rows];
    newRows[index].label = value;
    setFormData({ ...formData, rows: newRows });
  };

  const updateRowValue = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...formData.rows];
    newRows[rowIndex].values[colIndex] = value;
    setFormData({ ...formData, rows: newRows });
  };

  const columns = [
    {
      key: "name" as keyof Prize,
      label: "Name",
      sortable: true,
    },
    {
      key: "commission" as keyof Prize,
      label: "Commission (%)",
      render: (value: number) => <span>{value}%</span>,
      sortable: true,
    },
    {
      key: "status" as keyof Prize,
      label: "Status",
      render: (value: string) => (
        <Badge
          variant={value === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {value}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: "created_at" as keyof Prize,
      label: "Created",
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "-",
      sortable: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prize Management</h1>
          <p className="text-muted-foreground">
            Manage prize tables and commission rates
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Prize
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Prize</DialogTitle>
            </DialogHeader>
            <PrizeForm
              formData={formData}
              setFormData={setFormData}
              addColumn={addColumn}
              removeColumn={removeColumn}
              updateColumn={updateColumn}
              addRow={addRow}
              removeRow={removeRow}
              updateRowLabel={updateRowLabel}
              updateRowValue={updateRowValue}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Prize
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        <DataTable
          columns={columns}
          data={prizes}
          searchKey="name"
          searchPlaceholder="Search prizes..."
          actions={(prize) => (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(prize)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrizeToDelete(prize.id);
                  setIsDeleteAlertOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          )}
        />
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prize</DialogTitle>
          </DialogHeader>
          <PrizeForm
            formData={formData}
            setFormData={setFormData}
            addColumn={addColumn}
            removeColumn={removeColumn}
            updateColumn={updateColumn}
            addRow={addRow}
            removeRow={removeRow}
            updateRowLabel={updateRowLabel}
            updateRowValue={updateRowValue}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Prize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the prize
              table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface PrizeFormProps {
  formData: {
    name: string;
    columns: string[];
    rows: { label: string; values: string[] }[];
  };
  setFormData: (data: any) => void;
  addColumn: () => void;
  removeColumn: (index: number) => void;
  updateColumn: (index: number, value: string) => void;
  addRow: () => void;
  removeRow: (index: number) => void;
  updateRowLabel: (index: number, value: string) => void;
  updateRowValue: (rowIndex: number, colIndex: number, value: string) => void;
}

function PrizeForm({
  formData,
  setFormData,
  // addColumn,
  // removeColumn,
  // updateColumn,
  addRow,
  removeRow,
  updateRowLabel,
  updateRowValue,
}: PrizeFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          placeholder="e.g., Standard Prize Table"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Prize Table</Label>
          <div className="flex gap-2">
            {/* <Button type="button" variant="outline" size="sm" onClick={addColumn}>
              <Plus className="w-4 h-4 mr-1" />
              Add Column
            </Button> */}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-4 h-4 mr-1" />
              Add Row
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-24 text-center">Draws</TableHead>
                {formData.columns.map((col, idx) => (
                  <TableHead key={idx} className="text-center">
                    {col}
                    {/* <div className="flex items-center gap-2">
                      <Input
                        value={col}
                        onChange={(e) => updateColumn(idx, e.target.value)}
                        placeholder={`Column ${idx + 1}`}
                        className="min-w-12"
                      />
                      {formData.columns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeColumn(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div> */}
                  </TableHead>
                ))}
                <TableHead className="w-12.5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.rows.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
                  <TableCell>
                    <Input
                      value={row.label}
                      onChange={(e) => updateRowLabel(rowIdx, e.target.value)}
                      placeholder={`Row ${rowIdx + 1}`}
                    />
                  </TableCell>
                  {row.values.map((value, colIdx) => (
                    <TableCell key={colIdx}>
                      <Input
                        value={value}
                        onChange={(e) =>
                          updateRowValue(rowIdx, colIdx, e.target.value)
                        }
                        placeholder="0"
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    {formData.rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(rowIdx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
