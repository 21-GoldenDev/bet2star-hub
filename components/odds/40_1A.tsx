import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const rows = [
	{ draws: "1~12", u1: 18, u2: 26, u3: 40, u4: 72, u5: 120, u6: 200, u7: 360 },
	{ draws: "13~14", u1: 9, u2: 13, u3: 20, u4: 36, u5: 60, u6: 100, u7: 180 },
	{ draws: "15~16", u1: 4, u2: 6, u3: 10, u4: 18, u5: 30, u6: 50, u7: 90 },
	{ draws: "17~49", u1: 1, u2: 3, u3: 5, u4: 9, u5: 15, u6: 25, u7: 45 },
];

const Odd_40_1A: React.FC = () => {
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

export default Odd_40_1A;