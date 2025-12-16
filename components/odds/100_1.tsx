import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const rows = [
  { draws: "1~12", u1: 44, u2: 70, u3: 100, u4: 150, u5: 300, u6: 350, u7: 500 },
  { draws: "13~14", u1: 22, u2: 35, u3: 50, u4: 75, u5: 150, u6: 175, u7: 250 },
  { draws: "15~16", u1: 11, u2: 17, u3: 25, u4: 32, u5: 75, u6: 86, u7: 125 },
  { draws: "17~49", u1: 1, u2: 8, u3: 12, u4: 16, u5: 32, u6: 43, u7: 62 },
];

const Odd_100_1: React.FC = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">Draws</TableHead>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">U1</TableHead>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">U2</TableHead>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">U3</TableHead>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">U4</TableHead>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">U5</TableHead>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">U6</TableHead>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">U7</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.draws}>
            <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{r.draws}</TableCell>
            <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{r.u1}</TableCell>
            <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{r.u2}</TableCell>
            <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{r.u3}</TableCell>
            <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{r.u4}</TableCell>
            <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{r.u5}</TableCell>
            <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{r.u6}</TableCell>
            <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{r.u7}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default Odd_100_1;