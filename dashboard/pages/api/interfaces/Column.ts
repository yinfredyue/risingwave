interface ColumnType {
  tyepName: String;
  isNullable: Boolean;
}

interface ColumnDesc {
  columnType: ColumnType;
  name: String;
  columnId?: Number;
}

export interface Column {
  columnDesc: ColumnDesc;
  isHidden?: Boolean;
}
