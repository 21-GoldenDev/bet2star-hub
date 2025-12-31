import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Prize } from "@/lib/types/prize";

interface Props {
  prize: Prize;
}

const PrizeTable: React.FC<Props> = ({ prize }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-1 border border-gray-600 font-bold text-center">Draws</TableHead>
          {prize.data.columns.map((column) => (
            <TableHead key={column} className="px-1 border border-gray-600 font-bold text-center">{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.keys(prize.data.data).map((key) => {
          const row = prize.data.data[key];
          return (
            <TableRow key={key}>
              <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{key}</TableCell>
              {row.map((value, index) => (
                <TableCell key={index} className="px-1 border border-gray-600 text-gray-400 text-center">{value}</TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default PrizeTable;