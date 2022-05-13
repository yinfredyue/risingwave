interface ColumnType {
  tyepName: String;
  isNullable: Boolean;
}

export interface ColumnDesc {
  columnType: ColumnType;
  name: String;
  columnId?: Number;
}

export interface Column {
  columnDesc: ColumnDesc;
  isHidden?: Boolean;
}
